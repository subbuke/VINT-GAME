import './App.css'
import { Route, Routes } from "react-router-dom";
import Home from './Home';
import Snake from './Snake';
import ContactForm from './Contact';

function App() {
 

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />}/>
        <Route path="/snake" element={<Snake />}/>
        <Route path="/contact" element={<ContactForm />}/>
      </Routes>
    </>
  )
}

export default App
