"use client";

import React, { useState } from "react";
import FlashcardCard from "./FlashcardCard";
import { type DiagramData } from "@/app/components/GeometryRenderer";

interface Choice {
  choice_id: string;
  content: string;
}

interface OrderingStep {
  step_content: string;
  correct_order: number;
}

interface Flashcard {
  flashcard_type: string;
  topic_id?: number;
  learning_object: string;
  level: string;
  question: string;
  answer: string;
  explanation?: string;
  hint?: string;
  choices?: Choice[];
  ordering_steps_items?: OrderingStep[];
  diagram_data?: DiagramData;
}

type FlashcardDataSource = "array" | "flashcards" | "data" | null;

export default function FlashcardViewer() {
  const [jsonInput, setJsonInput] = useState("");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [error, setError] = useState("");
  const [, setParsedRoot] = useState<unknown>(null);
  const [dataSource, setDataSource] = useState<FlashcardDataSource>(null);
  const [editLabelsMode, setEditLabelsMode] = useState(false);

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    setJsonInput(pastedText);
    parseJson(pastedText);
  };

  const parseJson = (text: string) => {
    try {
      setError("");
      const parsed = JSON.parse(text);
      
      // Check if it's an array or object with flashcards property
      let flashcardsArray: Flashcard[] = [];
      if (Array.isArray(parsed)) {
        flashcardsArray = parsed;
        setDataSource("array");
      } else if (parsed.flashcards && Array.isArray(parsed.flashcards)) {
        flashcardsArray = parsed.flashcards;
        setDataSource("flashcards");
      } else if (parsed.data && Array.isArray(parsed.data)) {
        flashcardsArray = parsed.data;
        setDataSource("data");
      } else {
        setDataSource(null);
        setParsedRoot(null);
        throw new Error("Không tìm thấy mảng flashcards trong JSON");
      }

      setFlashcards(flashcardsArray);
      setParsedRoot(parsed);
    } catch (err) {
      setError(
        `Lỗi parse JSON: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      setFlashcards([]);
      setParsedRoot(null);
      setDataSource(null);
    }
  };

  const updateJsonTextFromRoot = (root: unknown) => {
    setJsonInput(JSON.stringify(root, null, 2));
  };

  const handleFlashcardDiagramDataChange = (
    flashcardIndex: number,
    nextDiagramData: DiagramData
  ) => {
    setFlashcards((prev) =>
      prev.map((flashcard, index) =>
        index === flashcardIndex
          ? { ...flashcard, diagram_data: nextDiagramData }
          : flashcard
      )
    );

    setParsedRoot((previousRoot: unknown) => {
      if (!previousRoot || !dataSource) {
        return previousRoot;
      }

      const rootCopy = JSON.parse(JSON.stringify(previousRoot));
      let targetArray: Flashcard[] | null = null;

      if (dataSource === "array" && Array.isArray(rootCopy)) {
        targetArray = rootCopy as Flashcard[];
      } else if (
        dataSource === "flashcards" &&
        typeof rootCopy === "object" &&
        rootCopy !== null &&
        Array.isArray((rootCopy as { flashcards?: unknown }).flashcards)
      ) {
        targetArray = (rootCopy as { flashcards: Flashcard[] }).flashcards;
      } else if (
        dataSource === "data" &&
        typeof rootCopy === "object" &&
        rootCopy !== null &&
        Array.isArray((rootCopy as { data?: unknown }).data)
      ) {
        targetArray = (rootCopy as { data: Flashcard[] }).data;
      }

      if (!targetArray || !targetArray[flashcardIndex]) {
        return previousRoot;
      }

      targetArray[flashcardIndex] = {
        ...targetArray[flashcardIndex],
        diagram_data: nextDiagramData,
      };

      updateJsonTextFromRoot(rootCopy);
      return rootCopy;
    });
  };

  const handleClear = () => {
    setJsonInput("");
    setFlashcards([]);
    setError("");
    setParsedRoot(null);
    setDataSource(null);
    setEditLabelsMode(false);
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            Flashcards Viewer
          </h2>
          <div className="flex items-center gap-2">
            {flashcards.some((flashcard) => flashcard.diagram_data) && (
              <button
                onClick={() => setEditLabelsMode((prev) => !prev)}
                className={`px-4 py-2 rounded-lg transition-colors text-white ${
                  editLabelsMode
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-purple-600 hover:bg-purple-700"
                }`}
              >
                {editLabelsMode ? "Tắt Edit Labels" : "Edit Labels"}
              </button>
            )}
            {jsonInput && (
              <button
                onClick={handleClear}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Paste JSON data (Ctrl+V):
          </label>
          <textarea
            value={jsonInput}
            onChange={(e) => {
              setJsonInput(e.target.value);
              parseJson(e.target.value);
            }}
            onPaste={handlePaste}
            placeholder='Paste your flashcards JSON here... Example: [{"question": "...", "answer": "...", ...}]'
            className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
          />
          {error && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          {flashcards.length > 0 && (
            <div className="mt-2 text-sm text-green-600 font-medium">
              ✓ Đã tải {flashcards.length} flashcards
            </div>
          )}
          {editLabelsMode && (
            <div className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              Chế độ Edit Labels đang bật: kéo trực tiếp các nhãn trên hình. JSON trong ô này sẽ được update ngay sau khi thả chuột.
            </div>
          )}
        </div>
      </div>

      {flashcards.length > 0 && (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">
              Tổng quan
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {flashcards.length}
                </div>
                <div className="text-sm text-gray-600">Tổng số thẻ</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {flashcards.filter((f) => f.level === "Nhận biết").length}
                </div>
                <div className="text-sm text-gray-600">Nhận biết</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {flashcards.filter((f) => f.level === "Thông hiểu").length}
                </div>
                <div className="text-sm text-gray-600">Thông hiểu</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {flashcards.filter((f) => f.level === "Vận dụng").length}
                </div>
                <div className="text-sm text-gray-600">Vận dụng</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-purple-200">
              <div className="text-sm font-medium text-purple-800 mb-2">
                Phân loại theo loại thẻ:
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {Array.from(new Set(flashcards.map((f) => f.flashcard_type)))
                  .sort()
                  .map((type) => (
                    <div
                      key={type}
                      className="bg-white px-3 py-2 rounded border border-purple-100"
                    >
                      <span className="font-semibold text-purple-700">
                        {flashcards.filter((f) => f.flashcard_type === type).length}
                      </span>
                      <span className="text-gray-600 ml-1">{type}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {flashcards.map((flashcard, index) => (
            <FlashcardCard
              key={index}
              flashcard={flashcard}
              index={index}
              editableLabels={editLabelsMode}
              onDiagramDataChange={(nextDiagramData) =>
                handleFlashcardDiagramDataChange(index, nextDiagramData)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

