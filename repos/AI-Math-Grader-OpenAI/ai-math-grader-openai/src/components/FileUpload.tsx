'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploadProps {
    onFilesSelect: (files: File[]) => void;
    selectedFiles: File[];
    maxFiles?: number;
}

export default function FileUpload({
    onFilesSelect,
    selectedFiles,
    maxFiles = 10
}: FileUploadProps) {
    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            // Append new files, but limit to maxFiles total
            const newFiles = [...selectedFiles, ...acceptedFiles].slice(0, maxFiles);
            onFilesSelect(newFiles);
        }
    }, [onFilesSelect, selectedFiles, maxFiles]);

    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/heic': ['.heic', '.HEIC'],
            'image/heif': ['.heif', '.HEIF'],
            'image/jpeg': ['.jpg', '.jpeg', '.JPG', '.JPEG'],
            'image/png': ['.png', '.PNG'],
            'image/webp': ['.webp', '.WEBP'],
        },
        maxFiles: maxFiles,
        maxSize: 20 * 1024 * 1024, // 20MB per file
    });

    const removeFile = (index: number) => {
        const newFiles = selectedFiles.filter((_, i) => i !== index);
        onFilesSelect(newFiles);
    };

    const hasFiles = selectedFiles.length > 0;

    return (
        <div className="file-upload-container">
            <div
                {...getRootProps()}
                className={`dropzone ${isDragActive ? 'active' : ''} ${isDragReject ? 'reject' : ''} ${hasFiles ? 'has-file' : ''}`}
            >
                <input {...getInputProps()} />
                <div className="dropzone-content">
                    <div className="dropzone-icon">
                        {isDragActive ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="12" y1="18" x2="12" y2="12" />
                                <line x1="9" y1="15" x2="15" y2="15" />
                            </svg>
                        )}
                    </div>
                    <div className="dropzone-text">
                        {isDragActive ? (
                            <p className="dropzone-primary">Drop your files here...</p>
                        ) : isDragReject ? (
                            <p className="dropzone-primary error">Unsupported file type</p>
                        ) : (
                            <>
                                <p className="dropzone-primary">
                                    📸 Drop your answer sheets here
                                </p>
                                <p className="dropzone-secondary">
                                    iPhone photos (HEIC), JPEG, PNG, or PDF
                                </p>
                                <p className="dropzone-hint">
                                    Up to {maxFiles} pages • Max 20MB per file
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Selected files list */}
            {hasFiles && (
                <div className="selected-files">
                    <div className="files-header">
                        <span className="files-count">
                            📎 {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} selected
                        </span>
                        {selectedFiles.length < maxFiles && (
                            <span className="files-hint">Click or drag to add more</span>
                        )}
                    </div>
                    <div className="files-list">
                        {selectedFiles.map((file, index) => (
                            <div key={`${file.name}-${index}`} className="file-item">
                                <div className="file-info-row">
                                    <span className="file-number">Page {index + 1}</span>
                                    <span className="file-name">{file.name}</span>
                                    <span className="file-size">{(file.size / 1024).toFixed(0)} KB</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFile(index);
                                        }}
                                        className="file-remove"
                                        title="Remove file"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
