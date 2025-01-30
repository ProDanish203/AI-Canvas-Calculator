import React from "react";
import { Button } from "../ui/button";
import { COLORS } from "@/lib/constants";
import { RedoIcon, UndoIcon } from "lucide-react";

interface TopbarProps {
  setColor: (color: string) => void;
  color: string;
  resetCanvas: () => void;
  getResults: () => void;
  performUndo: () => void;
  performRedo: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  color,
  setColor,
  resetCanvas,
  getResults,
  performUndo,
  performRedo,
}) => {
  return (
    <div className="z-10 flex items-center justify-between gap-2 sm:px-10 px-2 h-[80px] bg-black">
      {/* Operations */}
      <div className="flex items-center gap-2">
        <Button className="" onClick={resetCanvas}>
          Reset
        </Button>
        <Button className="" onClick={performUndo}>
          <UndoIcon size={14} />
        </Button>
        <Button className="" onClick={performRedo}>
          <RedoIcon size={14} />
        </Button>
      </div>
      {/* Color bar to select the color */}
      <div className="flex items-center justify-between gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-8 h-8 rounded-full transition-all border-2 border-gray-600 ${
              color === c
                ? "border-white border-4 scale-105"
                : "hover:scale-105"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      {/* Run Button */}
      <Button className="" onClick={getResults}>
        Run
      </Button>
    </div>
  );
};
