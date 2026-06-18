

import { Route, Routes } from "react-router-dom";
import Home from './Home';
import Snake from './Snake';
import Feedback from './Feedback';
import Ludo from './Components/Ludo'
import Mario from './Components/Mario'
import PuzzleGame from './Components/Puzzle'

function App() {
 

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />}/>
        <Route path="/snake" element={<Snake />}/>
        <Route path="/feedback" element={<Feedback />}/>
        <Route path="/Ludo" element={<Ludo />}/>
        <Route path="/mario" element={<Mario />}/>
        <Route path="/puzzle" element={<PuzzleGame />} />
      </Routes>
    </>
  )
}

export default App
