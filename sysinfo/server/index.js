import express from 'express'
import cors from 'cors'
import { readFileSync } from 'fs'
import si from 'systeminformation'

const app = express()
const PORT = process.env.PORT || 3010

app.use(cors())

const gb = (bytes) => Math.round((bytes / 1e9) * 10) / 10

// systeminformation sees the container's net namespace, so diff the host's counters via PID 1.
const NETDEV_PATHS = ['/proc/1/net/dev', '/host/proc/1/net/dev', '/proc/net/dev']
const VIRTUAL_IFACE = /^(lo|docker|veth|br-|virbr|cni|flannel|tun|tap|kube|cali)/

function readNetDev() {
  for (const path of NETDEV_PATHS) {
    try {
      const txt = readFileSync(path, 'utf8')
      const out = {}
      for (const line of txt.split('\n')) {
        const i = line.indexOf(':')
        if (i < 0) continue
        const iface = line.slice(0, i).trim()
        if (VIRTUAL_IFACE.test(iface)) continue
        const cols = line.slice(i + 1).trim().split(/\s+/).map(Number)
        out[iface] = { rx: cols[0], tx: cols[8] }
      }
      if (Object.keys(out).length) return out
    } catch {}
  }
  return null
}

// The container only has its docker address, so read host addresses from PID 1's fib_trie.
const FIBTRIE_PATHS = ['/proc/1/net/fib_trie', '/host/proc/1/net/fib_trie', '/proc/net/fib_trie']
function localIp() {
  for (const path of FIBTRIE_PATHS) {
    try {
      const lines = readFileSync(path, 'utf8').split('\n')
      const ips = []
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(/\|--\s+(\d+\.\d+\.\d+\.\d+)/)
        if (m && /host\s+LOCAL/.test(lines[i + 1] || '') && !m[1].startsWith('127.')) {
          ips.push(m[1])
        }
      }
      const pick =
        ips.find((ip) => ip.startsWith('192.168.')) ||
        ips.find((ip) => ip.startsWith('10.')) ||
        ips.find((ip) => !ip.startsWith('172.')) ||
        ips[0]
      if (pick) return pick
    } catch {}
  }
  return null
}

let prevNet = null

function networkRate() {
  const now = Date.now()
  const cur = readNetDev()
  let downMBs = 0
  let upMBs = 0
  let iface = '—'
  if (cur) {
    iface = Object.keys(cur).sort((a, b) => cur[b].rx + cur[b].tx - (cur[a].rx + cur[a].tx))[0] || '—'
    if (prevNet && cur[iface] && prevNet.ifaces[iface]) {
      const dt = (now - prevNet.t) / 1000
      if (dt > 0) {
        downMBs = Math.max(0, (cur[iface].rx - prevNet.ifaces[iface].rx) / dt / 1e6)
        upMBs = Math.max(0, (cur[iface].tx - prevNet.ifaces[iface].tx) / dt / 1e6)
      }
    }
    prevNet = { t: now, ifaces: cur }
  }
  return { downMBs, upMBs, iface }
}

app.get('/api/sysinfo/health', (_, res) => res.json({ ok: true }))

app.get('/api/sysinfo', async (_, res) => {
  try {
    const [load, mem, fs, temp, gfx, time] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.cpuTemperature(),
      si.graphics(),
      si.time(),
    ])

    const disks = (fs || []).filter((d) => d.size > 0)
    const root =
      disks.find((d) => d.mount === '/host') ||
      disks.find((d) => d.mount === '/') ||
      disks.sort((a, b) => b.size - a.size)[0] ||
      {}

    const gpu = (gfx?.controllers || []).find(
      (c) => c.utilizationGpu != null || c.temperatureGpu != null
    )

    const net = { ...networkRate(), localIp: localIp() }

    res.json({
      cpu: { load: load.currentLoad ?? 0 },
      mem: {
        percent: mem.total ? (mem.active / mem.total) * 100 : 0,
        usedGB: gb(mem.active || 0),
        totalGB: gb(mem.total || 0),
      },
      gpu: gpu
        ? { load: gpu.utilizationGpu ?? 0, tempC: gpu.temperatureGpu ?? null }
        : null,
      disk: {
        percent: root.use ?? (root.size ? (root.used / root.size) * 100 : 0),
        usedGB: gb(root.used || 0),
        totalGB: gb(root.size || 0),
        freeGB: gb(root.available || 0),
      },
      temp: { cpuC: temp.main ?? null, maxC: temp.max ?? null },
      net,
      uptime: time.uptime ?? 0,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => console.log(`sysinfo server running on port ${PORT}`))
