"use client";

import { Topbar } from "@/components/shared/Topbar";
import { GeneratedResult, ImageResponse } from "@/lib/types";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import axios from "axios";

// const MAX_HISTORY = 20;

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#ffffff");
  const [result, setResult] = useState<GeneratedResult[]>();
  const [dictOfVars, setDictOfVars] = useState({});
  const [latexExpr, setLatexExpr] = useState<string[]>([]);
  const [latexPosition, setLatexPosition] = useState<{
    x: number;
    y: number;
  }>({ x: 10, y: 200 });

  const [canvasStates, setCanvasStates] = useState<string[]>([]);
  const [redoStates, setRedoStates] = useState<string[]>([]);

  const TOUCH_Y_OFFSET = -30;

  useEffect(() => {
    if (typeof window === "undefined") return;
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

  // To prevent touch scroll
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventDefault = (e: Event) => {
      e.preventDefault();
    };

    canvas.addEventListener("touchstart", preventDefault, { passive: false });
    canvas.addEventListener("touchmove", preventDefault, { passive: false });
    canvas.addEventListener("touchend", preventDefault, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", preventDefault);
      canvas.removeEventListener("touchmove", preventDefault);
      canvas.removeEventListener("touchend", preventDefault);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!result) return;
    result.forEach((result) => {
      renderLatexToCanvas(result.expression, result.answer);
    });
  }, [result]);

  const renderLatexToCanvas = (expression: string, answer: string) => {
    const latex = `${expression} = ${answer}`;
    setLatexExpr((prev) => [...prev, latex]);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

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
    if (typeof window === "undefined") return;
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
  }, [undo, redo]);

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

  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top + TOUCH_Y_OFFSET;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top + TOUCH_Y_OFFSET;

    ctx.strokeStyle = color;
    ctx.lineTo(x, y);
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
    setLatexExpr([]);
    setResult(undefined);
    setDictOfVars({});
  };

  const getResults = async () => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_BASE_API_URL}/calculate-results`,
        {
          image: canvas.toDataURL("image/png"),
          dict_of_vars: dictOfVars,
        }
      );
      if (!data.success) return toast.error(data.message);
      if (data.data.length === 0) return toast.error("No response :(");

      data.data.forEach((res: ImageResponse) => {
        if (res.assign) {
          setDictOfVars((prev) => ({ ...prev, [res.expr]: res.result }));
        }
      });
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let minX = canvas.width,
        minY = canvas.height,
        maxX = 0,
        maxY = 0;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const i = y * canvas.width + x;
          if (imageData.data[i * 4 + 3] > 0) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      setLatexPosition({ x: centerX, y: centerY });

      data.data.forEach((res: ImageResponse) => {
        setTimeout(() => {
          setResult((prev) => [
            ...(prev || []),
            { expression: res.expr, answer: res.result },
          ]);
        }, 200);
      });
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
          onTouchStart={startDrawingTouch}
          onTouchEnd={stopDrawing}
          onTouchMove={drawTouch}
          className="absolute top-0 left-0 w-full h-full bg-black"
        />

        {latexExpr &&
          latexExpr.map((latex, idx) => (
            <div
              key={idx}
              className="absolute text-white p-2 sm:text-5xl text-2xl font-bold rounded-md shadow-md"
              style={{
                zIndex: 1000,
                left: `${latexPosition.x}px`,
                top: `${latexPosition.y + idx * 50}px`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {latex}
            </div>
          ))}
      </div>
    </div>
  );
}
