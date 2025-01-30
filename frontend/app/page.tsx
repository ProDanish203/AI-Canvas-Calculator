"use client";

import { Topbar } from "@/components/shared/Topbar";
import { GeneratedResult } from "@/lib/types";
import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import axios from "axios";

// const MAX_HISTORY = 20;

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#ffffff");
  const [result, setResult] = useState<GeneratedResult>();
  const [dictOfVars, setDictOfVars] = useState({});
  const [canvasStates, setCanvasStates] = useState<string[]>([]);
  const [redoStates, setRedoStates] = useState<string[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.canvas.width = window.innerWidth;
    ctx.canvas.height = window.innerHeight - 80; // Subtract space for Topbar
    ctx.lineCap = "round";
    ctx.lineWidth = 3;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save initial state
    const initialState = canvas.toDataURL();
    setCanvasStates([initialState]);
  }, []);

  // Add useCallback to memoize undo and redo functions
  const undo = useCallback(() => {
    if (canvasStates.length <= 1) return; // Keep at least initial state

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get the current state and add it to redo stack
    const currentState = canvasStates[canvasStates.length - 1];
    const newStates = canvasStates.slice(0, -1);

    setCanvasStates(newStates);
    setRedoStates((prev) => [...prev, currentState]);

    // Load previous state
    const img = new Image();
    img.src = newStates[newStates.length - 1];
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
  }, [canvasStates, setCanvasStates, setRedoStates]);

  const redo = useCallback(() => {
    if (redoStates.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get the last redo state
    const stateToRestore = redoStates[redoStates.length - 1];
    const newRedoStates = redoStates.slice(0, -1);

    // Add current state back to canvas states
    setCanvasStates((prev) => [...prev, stateToRestore]);
    setRedoStates(newRedoStates);

    // Load the redo state
    const img = new Image();
    img.src = stateToRestore;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
  }, [redoStates, setRedoStates, setCanvasStates]);

  // Add new useEffect for keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      } else if (
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "z") ||
        (e.ctrlKey && e.key.toLowerCase() === "y")
      ) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [undo, redo]); // Dependencies for the event listener

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    setIsDrawing(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;

    // Save canvas state after stroke is complete
    const canvas = canvasRef.current;
    if (!canvas) return;
    const currentState = canvas.toDataURL();
    setCanvasStates((prev) => [...prev, currentState]);
    // setCanvasStates((prev) => [...prev.slice(-MAX_HISTORY), currentState]);

    // Clear redo states when new stroke is made
    setRedoStates([]);
    setIsDrawing(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  };

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Reset canvas states to initial black state
    const initialState = canvas.toDataURL();
    setCanvasStates([initialState]);
  };

  const getResults = async () => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_BASE_API_URL}/calculate-results`,
        {
          image: canvas.toDataURL("image/png"), // Conver the canvas to a base64 image
          dict_of_vars: dictOfVars,
        }
      );

      console.log(data);
    } catch (err) {
      toast.error("Error in getting results");
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <Topbar
        setColor={setColor}
        color={color}
        resetCanvas={resetCanvas}
        getResults={getResults}
        performUndo={undo}
        performRedo={redo}
      />
      <div className="relative flex-1">
        <canvas
          ref={canvasRef}
          id="canvas"
          onMouseDown={startDrawing}
          onMouseOut={stopDrawing}
          onMouseUp={stopDrawing}
          onMouseMove={draw}
          className="absolute top-0 left-0 w-full h-full bg-black"
        />
      </div>
    </div>
  );
}
