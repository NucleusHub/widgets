import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import spotifyRoutes from './routes/spotify.js'

const app = express()
const PORT = process.env.PORT || 3002

app.use(cors())
app.use(express.json())
app.use('/api/spotify', spotifyRoutes)

app.listen(PORT, () => console.log(`Spotify server running on port ${PORT}`))
