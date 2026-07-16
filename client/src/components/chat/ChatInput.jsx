import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import "../../styles/ChatInput.scss";

const MAX_TEXTAREA_HEIGHT = 160;
const MAX_IMAGE_COUNT = 4;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const VISION_MODEL_KEYS = Object.freeze([
  "GPT",
  "GEMINI",
  "CLAUDE",
]);

function formatFileSize(size = 0) {
  const bytes = Number(size);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPdfFile(file) {
  if (!file) {
    return false;
  }

  return (
    file.type === "application/pdf" ||
    file.name?.toLowerCase().endsWith(".pdf")
  );
}

function isImageFile(file) {
  if (!file) {
    return false;
  }

  return ACCEPTED_IMAGE_TYPES.includes(file.type);
}

function createImagePreview(file) {
  return {
    id: `image-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`,
    file,
    name: file.name,
    size: file.size,
    type: file.type,
    previewUrl: URL.createObjectURL(file),
  };
}

function normalizeSelectedImages(selectedImages = []) {
  if (!Array.isArray(selectedImages)) {
    return [];
  }

  return selectedImages.filter(Boolean);
}

function ChatInput({
  onSend,

  onPdfSelect,
  selectedPdf = null,
  onRemovePdf,

  onImageSelect,
  selectedImages = [],
  onRemoveImage,

  selectedModel = "GEMINI",

  isLoading = false,
  isPdfLoading = false,
  isImageLoading = false,

  disabled = false,
}) {
  const [message, setMessage] = useState("");
  const [localImages, setLocalImages] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState("");

  const textareaRef = useRef(null);
  const pdfInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const dragCounterRef = useRef(0);

  const normalizedModel = String(
    selectedModel || "GEMINI"
  )
    .trim()
    .toUpperCase();

  const visionSupported =
    VISION_MODEL_KEYS.includes(normalizedModel);

  const externalImages =
    normalizeSelectedImages(selectedImages);

  const displayedImages =
    externalImages.length > 0
      ? externalImages
      : localImages;

  const busy =
    disabled ||
    isLoading ||
    isPdfLoading ||
    isImageLoading;

  const hasAttachment =
    Boolean(selectedPdf) ||
    displayedImages.length > 0;

  useEffect(() => {
    return () => {
      localImages.forEach((image) => {
        if (image?.previewUrl) {
          URL.revokeObjectURL(image.previewUrl);
        }
      });
    };
  }, [localImages]);

  useEffect(() => {
    if (!visionSupported && displayedImages.length > 0) {
      setFileError(
        "DeepSeek rasmlarni tahlil qilmaydi. GPT, Gemini yoki Claude modelini tanlang."
      );
    } else {
      setFileError((previousError) => {
        if (
          previousError.includes(
            "rasmlarni tahlil qilmaydi"
          )
        ) {
          return "";
        }

        return previousError;
      });
    }
  }, [displayedImages.length, visionSupported]);

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";

    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      MAX_TEXTAREA_HEIGHT
    )}px`;
  }, []);

  const resetTextarea = useCallback(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "40px";
  }, []);

  const clearFileError = useCallback(() => {
    setFileError("");
  }, []);

  const handleChange = useCallback(
    (event) => {
      setMessage(event.target.value);
      clearFileError();

      requestAnimationFrame(resizeTextarea);
    },
    [clearFileError, resizeTextarea]
  );

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();

      const cleanMessage = message.trim();

      if (!cleanMessage || busy) {
        return;
      }

      if (
        displayedImages.length > 0 &&
        !visionSupported
      ) {
        setFileError(
          "Tanlangan model rasmlarni tahlil qilmaydi. GPT, Gemini yoki Claude modelini tanlang."
        );

        return;
      }

      if (typeof onSend !== "function") {
        return;
      }

      onSend(cleanMessage);

      setMessage("");
      clearFileError();

      requestAnimationFrame(resetTextarea);
    },
    [
      busy,
      clearFileError,
      displayedImages.length,
      message,
      onSend,
      resetTextarea,
      visionSupported,
    ]
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.nativeEvent?.isComposing
      ) {
        event.preventDefault();
        handleSubmit(event);
      }
    },
    [handleSubmit]
  );

  const handlePdfButtonClick = useCallback(() => {
    if (busy) {
      return;
    }

    clearFileError();
    pdfInputRef.current?.click();
  }, [busy, clearFileError]);

  const handleImageButtonClick = useCallback(() => {
    if (busy) {
      return;
    }

    if (!visionSupported) {
      setFileError(
        "Tanlangan model rasmlarni tahlil qilmaydi. GPT, Gemini yoki Claude modelini tanlang."
      );

      return;
    }

    clearFileError();
    imageInputRef.current?.click();
  }, [busy, clearFileError, visionSupported]);

  const processPdfFile = useCallback(
    async (file) => {
      if (!file || busy) {
        return;
      }

      if (!isPdfFile(file)) {
        setFileError(
          "Faqat PDF formatdagi faylni tanlang."
        );

        return;
      }

      clearFileError();

      if (typeof onPdfSelect === "function") {
        await onPdfSelect(file);
      }
    },
    [busy, clearFileError, onPdfSelect]
  );

  const processImageFiles = useCallback(
    async (files) => {
      if (busy) {
        return;
      }

      if (!visionSupported) {
        setFileError(
          "Tanlangan model rasmlarni tahlil qilmaydi. GPT, Gemini yoki Claude modelini tanlang."
        );

        return;
      }

      const incomingFiles = Array.from(
        files || []
      );

      if (incomingFiles.length === 0) {
        return;
      }

      const imageFiles = incomingFiles.filter(
        isImageFile
      );

      if (imageFiles.length !== incomingFiles.length) {
        setFileError(
          "Faqat JPG, PNG, WEBP yoki GIF rasmlarni yuklash mumkin."
        );

        return;
      }

      const oversizedFile = imageFiles.find(
        (file) => file.size > MAX_IMAGE_SIZE_BYTES
      );

      if (oversizedFile) {
        setFileError(
          `${oversizedFile.name} fayli juda katta. Har bir rasm 5 MB dan oshmasligi kerak.`
        );

        return;
      }

      const currentCount = displayedImages.length;
      const availableSlots =
        MAX_IMAGE_COUNT - currentCount;

      if (availableSlots <= 0) {
        setFileError(
          `Bir xabarga ko‘pi bilan ${MAX_IMAGE_COUNT} ta rasm yuklash mumkin.`
        );

        return;
      }

      const acceptedFiles = imageFiles.slice(
        0,
        availableSlots
      );

      if (imageFiles.length > availableSlots) {
        setFileError(
          `Faqat ${availableSlots} ta qo‘shimcha rasm qabul qilindi. Maksimal limit: ${MAX_IMAGE_COUNT} ta.`
        );
      } else {
        clearFileError();
      }

      if (typeof onImageSelect === "function") {
        await onImageSelect(acceptedFiles);
        return;
      }

      const previews =
        acceptedFiles.map(createImagePreview);

      setLocalImages((previousImages) => [
        ...previousImages,
        ...previews,
      ]);
    },
    [
      busy,
      clearFileError,
      displayedImages.length,
      onImageSelect,
      visionSupported,
    ]
  );

  const handlePdfFileChange = useCallback(
    async (event) => {
      const file = event.target.files?.[0];

      await processPdfFile(file);

      event.target.value = "";
    },
    [processPdfFile]
  );

  const handleImageFileChange = useCallback(
    async (event) => {
      await processImageFiles(
        event.target.files
      );

      event.target.value = "";
    },
    [processImageFiles]
  );

  const handleRemoveImage = useCallback(
    (image, index) => {
      if (busy) {
        return;
      }

      clearFileError();

      if (typeof onRemoveImage === "function") {
        onRemoveImage(
          image?.id ||
            image?._id ||
            index,
          image
        );

        return;
      }

      setLocalImages((previousImages) => {
        const targetImage =
          previousImages[index];

        if (targetImage?.previewUrl) {
          URL.revokeObjectURL(
            targetImage.previewUrl
          );
        }

        return previousImages.filter(
          (_, imageIndex) =>
            imageIndex !== index
        );
      });
    },
    [busy, clearFileError, onRemoveImage]
  );

  const handleDragEnter = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (busy) {
        return;
      }

      dragCounterRef.current += 1;
      setIsDragging(true);
    },
    [busy]
  );

  const handleDragOver = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (busy) {
        return;
      }

      event.dataTransfer.dropEffect = "copy";
      setIsDragging(true);
    },
    [busy]
  );

  const handleDragLeave = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      dragCounterRef.current = Math.max(
        dragCounterRef.current - 1,
        0
      );

      if (dragCounterRef.current === 0) {
        setIsDragging(false);
      }
    },
    []
  );

  const handleDrop = useCallback(
    async (event) => {
      event.preventDefault();
      event.stopPropagation();

      dragCounterRef.current = 0;
      setIsDragging(false);

      if (busy) {
        return;
      }

      const droppedFiles = Array.from(
        event.dataTransfer?.files || []
      );

      if (droppedFiles.length === 0) {
        return;
      }

      const pdfFiles =
        droppedFiles.filter(isPdfFile);

      const imageFiles =
        droppedFiles.filter(isImageFile);

      const unsupportedFiles =
        droppedFiles.filter(
          (file) =>
            !isPdfFile(file) &&
            !isImageFile(file)
        );

      if (unsupportedFiles.length > 0) {
        setFileError(
          "Faqat PDF, JPG, PNG, WEBP yoki GIF fayllarni yuklash mumkin."
        );

        return;
      }

      if (pdfFiles.length > 1) {
        setFileError(
          "Bir vaqtning o‘zida faqat bitta PDF yuklash mumkin."
        );

        return;
      }

      if (pdfFiles.length === 1) {
        await processPdfFile(pdfFiles[0]);
      }

      if (imageFiles.length > 0) {
        await processImageFiles(imageFiles);
      }
    },
    [
      busy,
      processImageFiles,
      processPdfFile,
    ]
  );

  return (
    <form
      className={[
        "chat-engine-input-form",
        isDragging
          ? "chat-engine-input-form--dragging"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onSubmit={handleSubmit}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="chat-drop-overlay">
          <div className="chat-drop-overlay-content">
            <span className="chat-drop-overlay-icon">
              📎
            </span>

            <strong>
              Fayllarni shu yerga tashlang
            </strong>

            <span>
              PDF yoki rasm fayllari
            </span>
          </div>
        </div>
      )}

      {fileError && (
        <div
          className="chat-file-error"
          role="alert"
        >
          <span>{fileError}</span>

          <button
            type="button"
            onClick={clearFileError}
            aria-label="Xatolik xabarini yopish"
          >
            ✕
          </button>
        </div>
      )}

      {selectedPdf && (
        <div className="chat-pdf-preview">
          <div className="chat-pdf-preview-info">
            <span className="chat-pdf-icon">
              📄
            </span>

            <div className="chat-pdf-details">
              <p className="chat-pdf-name">
                {selectedPdf.name}
              </p>

              <p className="chat-pdf-status">
                {isPdfLoading
                  ? "PDF o‘qilmoqda..."
                  : `PDF tayyor${
                      selectedPdf.size
                        ? ` · ${formatFileSize(
                            selectedPdf.size
                          )}`
                        : ""
                    }`}
              </p>
            </div>
          </div>

          {!isPdfLoading && (
            <button
              type="button"
              className="chat-pdf-remove"
              onClick={onRemovePdf}
              disabled={busy}
              aria-label="PDF faylni olib tashlash"
              title="PDF faylni olib tashlash"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {displayedImages.length > 0 && (
        <div className="chat-image-preview-list">
          {displayedImages.map(
            (image, index) => {
              const previewUrl =
                image?.previewUrl ||
                image?.url ||
                image?.dataUrl ||
                image?.imageUrl ||
                "";

              return (
                <div
                  key={
                    image?.id ||
                    image?._id ||
                    `${image?.name || "image"}-${index}`
                  }
                  className="chat-image-preview"
                >
                  <div className="chat-image-preview-media">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt={
                          image?.name ||
                          `Tanlangan rasm ${index + 1}`
                        }
                      />
                    ) : (
                      <div className="chat-image-placeholder">
                        🖼️
                      </div>
                    )}

                    {isImageLoading && (
                      <div className="chat-image-loading">
                        <span className="chat-engine-spinner" />
                      </div>
                    )}
                  </div>

                  <div className="chat-image-preview-info">
                    <p title={image?.name || ""}>
                      {image?.name ||
                        `Rasm ${index + 1}`}
                    </p>

                    <span>
                      {formatFileSize(
                        image?.size ||
                          image?.file?.size
                      )}
                    </span>
                  </div>

                  {!isImageLoading && (
                    <button
                      type="button"
                      className="chat-image-remove"
                      onClick={() =>
                        handleRemoveImage(
                          image,
                          index
                        )
                      }
                      disabled={busy}
                      aria-label={`${
                        image?.name ||
                        `Rasm ${index + 1}`
                      } faylini olib tashlash`}
                      title="Rasmni olib tashlash"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            }
          )}
        </div>
      )}

      <div className="chat-engine-input-wrapper">
        <input
          ref={pdfInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handlePdfFileChange}
          hidden
        />

        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={handleImageFileChange}
          hidden
        />

        <div className="chat-attachment-buttons">
          <button
            type="button"
            className="chat-attachment-button chat-pdf-button"
            onClick={handlePdfButtonClick}
            disabled={busy}
            title="PDF yuklash"
            aria-label="PDF yuklash"
          >
            {isPdfLoading ? "…" : "📄"}
          </button>

          <button
            type="button"
            className="chat-attachment-button chat-image-button"
            onClick={handleImageButtonClick}
            disabled={busy}
            title={
              visionSupported
                ? "Rasm yuklash"
                : "Tanlangan model rasmni qo‘llamaydi"
            }
            aria-label="Rasm yuklash"
          >
            {isImageLoading ? "…" : "🖼️"}
          </button>
        </div>

        <textarea
          ref={textareaRef}
          className="chat-engine-textarea"
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedPdf
              ? "PDF haqida savol yozing..."
              : displayedImages.length > 0
                ? "Rasm haqida savol yozing..."
                : "YordamAI ga xabar yozing..."
          }
          rows={1}
          disabled={busy}
          maxLength={50_000}
          aria-label="Chat xabari"
        />

        <button
          className="chat-engine-send-button"
          type="submit"
          disabled={!message.trim() || busy}
          aria-label="Xabar yuborish"
          title="Xabar yuborish"
        >
          {isLoading ? (
            <span className="chat-engine-spinner" />
          ) : (
            "➤"
          )}
        </button>
      </div>

      <div className="chat-engine-footer">
        <p className="chat-engine-hint">
          Enter — yuborish, Shift + Enter — yangi qator
        </p>

        <p className="chat-engine-attachment-hint">
          {hasAttachment
            ? "Fayl xabarga biriktirilgan"
            : "PDF yoki rasmni tashlab yuklashingiz mumkin"}
        </p>
      </div>
    </form>
  );
}

export default ChatInput;