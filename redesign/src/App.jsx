import Layout from './components/Layout'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import About from './pages/About'
import DigitalPrint from './pages/DigitalPrint'
import Upload from './pages/Upload'
import Policy from './pages/Policy'
import Reviews from './pages/Reviews'
import Contact from './pages/Contact'
import Profile from './pages/Profile'
import Dashboard from './pages/Dashboard'

function App() {

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/digital-print" element={<DigitalPrint />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/policy" element={<Policy />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Layout>
  )
}

export default App
