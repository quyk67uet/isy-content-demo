"use client";

import React, { useState, useMemo } from "react";
import { parseLatex } from "@/lib/utils";

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
}

interface FlashcardCardProps {
  flashcard: Flashcard;
  index: number;
}

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function FlashcardCard({ flashcard, index }: FlashcardCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const isMultipleChoice = flashcard.flashcard_type === "Trắc nghiệm";
  const isOrderingSteps = flashcard.flashcard_type === "Sắp xếp các bước";

  // Shuffle ordering steps once when component mounts (only for ordering steps type)
  const shuffledSteps = useMemo(() => {
    if (isOrderingSteps && flashcard.ordering_steps_items) {
      return shuffleArray(flashcard.ordering_steps_items);
    }
    return null;
  }, [isOrderingSteps, flashcard.ordering_steps_items]);

  return (
    <div className="bg-white rounded-lg shadow-md mb-6 border-l-4 border-purple-500 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 border-b border-purple-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-block bg-purple-100 text-purple-800 text-xs font-semibold px-3 py-1 rounded-full">
              Flashcard {index + 1}
            </span>
            {flashcard.flashcard_type && (
              <span className="inline-block bg-indigo-100 text-indigo-800 text-xs font-semibold px-3 py-1 rounded-full">
                {flashcard.flashcard_type}
              </span>
            )}
            {flashcard.level && (
              <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                {flashcard.level}
              </span>
            )}
            {flashcard.topic_id && (
              <span className="inline-block bg-orange-100 text-orange-800 text-xs font-semibold px-3 py-1 rounded-full">
                Topic {flashcard.topic_id}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsFlipped(!isFlipped)}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all transform hover:scale-105 text-sm font-medium"
          >
            {isFlipped ? "Xem câu hỏi" : "Xem đáp án"}
          </button>
        </div>
        <div className="text-xs text-gray-600 mt-2">
          Learning Object: {flashcard.learning_object}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-6">
        {!isFlipped ? (
          // Front Side - Question
          <div className="min-h-[200px] flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                Q
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Câu hỏi</h3>
            </div>
            <div className="flex-1 text-gray-800 leading-relaxed text-lg mb-4">
              {parseLatex(flashcard.question)}
            </div>

            {/* Choices for Multiple Choice Flashcards */}
            {isMultipleChoice && flashcard.choices && (
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Các lựa chọn:
                </div>
                <div className="space-y-2">
                  {flashcard.choices.map((choice) => (
                    <div
                      key={choice.choice_id}
                      className="p-3 rounded-lg border-2 border-gray-200 bg-gray-50"
                    >
                      <div className="flex items-start gap-3">
                        <span className="font-bold min-w-[24px] text-gray-700">
                          {choice.choice_id}.
                        </span>
                        <div className="flex-1 text-gray-800">
                          {parseLatex(choice.content)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Shuffled Ordering Steps (Front Side) */}
            {isOrderingSteps && shuffledSteps && (
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Sắp xếp các bước sau (thứ tự hiện tại là ngẫu nhiên):
                </div>
                <div className="space-y-3">
                  {shuffledSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-gray-50 border-2 border-gray-300 rounded-lg cursor-move hover:border-purple-400 transition-colors"
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-gray-400 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {idx + 1}
                        </div>
                        <div className="flex-1 text-gray-800">
                          {parseLatex(step.step_content)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-xs text-gray-500 italic">
                  💡 Hãy suy nghĩ về thứ tự đúng của các bước này
                </div>
              </div>
            )}

            {/* Hint */}
            {flashcard.hint && (
              <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                <div className="text-sm font-semibold text-yellow-800 mb-1">
                  💡 Gợi ý:
                </div>
                <div className="text-sm text-yellow-700">
                  {parseLatex(flashcard.hint)}
                </div>
              </div>
            )}
            <div className="mt-4 text-center text-sm text-gray-500 italic">
              Nhấn &quot;Xem đáp án&quot; để xem câu trả lời
            </div>
          </div>
        ) : (
          // Back Side - Answer
          <div className="min-h-[200px] flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                A
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Đáp án</h3>
            </div>
            <div className="flex-1 p-4 bg-green-50 border-2 border-green-200 rounded-lg text-gray-800 leading-relaxed mb-4">
              {parseLatex(flashcard.answer)}
            </div>

            {/* Ordering Steps Items */}
            {isOrderingSteps && flashcard.ordering_steps_items && (
              <div className="mb-4">
                <div className="text-sm font-semibold text-blue-800 mb-2">
                  📋 Các bước chi tiết:
                </div>
                <div className="space-y-3">
                  {flashcard.ordering_steps_items
                    .sort((a, b) => a.correct_order - b.correct_order)
                    .map((step, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white border-2 border-blue-200 rounded-lg"
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {step.correct_order}
                          </div>
                          <div className="flex-1 text-gray-800">
                            {parseLatex(step.step_content)}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Explanation */}
            {flashcard.explanation && (
              <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="text-sm font-semibold text-blue-800 mb-2">
                  📖 Giải thích:
                </div>
                <div className="text-gray-800 leading-relaxed">
                  {parseLatex(flashcard.explanation)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer indicator */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
        <div className="flex items-center justify-center gap-2">
          <div
            className={`w-3 h-3 rounded-full transition-all ${
              !isFlipped ? "bg-purple-500 scale-125" : "bg-gray-300"
            }`}
          ></div>
          <div
            className={`w-3 h-3 rounded-full transition-all ${
              isFlipped ? "bg-green-500 scale-125" : "bg-gray-300"
            }`}
          ></div>
        </div>
      </div>
    </div>
  );
}

