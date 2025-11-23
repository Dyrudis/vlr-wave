import { Routes, Route } from 'react-router-dom'
import HomePage from '@/pages/HomePage'
import RoomPage from '@/pages/RoomPage'
import CustomHeader from '@/components/layout/CustomHeader'
import { Toaster } from 'sonner'

function App() {
  return (
    <>
      <CustomHeader />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/:roomId" element={<RoomPage />} />
      </Routes>
      <Toaster closeButton />
    </>
  )
}

export default App
