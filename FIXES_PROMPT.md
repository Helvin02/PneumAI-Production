# PneumAI Platform Fixes Prompt for Gemini 3.0 Pro

## Context
You are tasked with fixing issues in the PneumAI platform, a lung cancer detection system using FastAPI backend with PostgreSQL, React frontend, and YOLOv12 (.onnx model). The platform handles patient data, doctor reviews, CT scan uploads, and real-time WebSocket updates.

## Current State Analysis
- Backend: FastAPI with PostgreSQL (psycopg2), serving on port 8000
- Frontend: React on port 3000
- Database: PostgreSQL with tables for users, patients, doctors, ct_scans, etc.
- Model: YOLOv12 using best.onnx
- WebSockets: For real-time scan updates
- File Storage: Local uploads directory with subdirs for originals, annotated, thumbnails

## Issues to Fix

### 1. Database Table Name Inconsistency
**Problem**: The `get_all_scans()` function in `app/database.py` queries `FROM scans` but the actual table is `ct_scans`. This breaks the `/api/v1/scans` endpoint for doctors/admins viewing all scans.

**Fix**: Update the query in `get_all_scans()` to use `ct_scans` instead of `scans`. Ensure all column names match the schema.

### 2. Scan Comments Table Schema Mismatch
**Problem**: The `scan_comments` table has a `comment_id BIGINT UNIQUE NOT NULL` field, but `create_scan_comment()` doesn't provide a value, causing insert failures.

**Fix**: Either remove `comment_id` from the schema (use auto-incrementing `id`) or modify the code to generate unique comment IDs.

### 3. Appointment Creation ID Conflict
**Problem**: `create_appointment()` manually inserts an `id` value, but `id` is SERIAL PRIMARY KEY.

**Fix**: Remove `id` from the INSERT statement in `create_appointment()` to let it auto-increment.

### 4. Message Creation ID Conflict
**Problem**: `create_message()` manually inserts `id` which should auto-increment.

**Fix**: Remove `id` from the INSERT statement in `create_message()`.

### 5. Patient ID Type Inconsistency
**Problem**: Scan functions handle `patient_id` as string or integer inconsistently.

**Fix**: Standardize to integer, add proper validation and error handling for invalid patient IDs.

### 6. Missing Authentication on Scan Endpoints
**Problem**: Scan endpoints lack authentication, allowing unauthorized access.

**Fix**: Add role-based access control. Ensure only doctors and admins can access `get_all_scans_endpoint`.

### 7. Scan Review Functionality for Doctors/Admins
**Problem**: Backend stores scan data and comments, but frontend may lack proper review interfaces.

**Fix**: Verify and update dashboard components to display scan lists, details, and enable commenting for authorized users.

### 8. Scan Visibility Logic
**Problem**: `get_all_scans` returns all scans without role-based filtering.

**Fix**: Implement filtering: doctors see their patients' scans, admins see all.

### 9. WebSocket URL Configuration
**Problem**: Frontend hardcodes `ws://localhost:8000/ws/scans`.

**Fix**: Make WebSocket URL configurable via environment variables for different environments.

### 10. File Upload Paths Congruency
**Problem**: File paths are consistent but frontend may not construct URLs correctly.

**Fix**: Ensure frontend uses backend base URL for image URLs.

### 11. CORS and Port Configuration
**Problem**: CORS allows localhost:3000, backend on 8000.

**Fix**: Ensure production configs use proper domains/ports.

### 12. Model Path Confirmation
**Problem**: Config uses best.onnx, but verify loading.

**Fix**: Confirm YOLO service loads .onnx correctly.

### 13. Database Connection Pooling
**Problem**: Pooling implemented but may need retry logic.

**Fix**: Add retry logic for connection failures.

### 14. Scan Deletion Cascade
**Problem**: Deleting scans may not remove files/comments properly.

**Fix**: Ensure database constraints and code handle cascades.

### 15. Error Handling Improvements
**Problem**: Poor error messages in scan operations.

**Fix**: Improve error handling and messages for database failures.

## Instructions
1. Read the relevant files to understand the current implementation.
2. Fix each issue step by step, testing after each fix.
3. Ensure PostgreSQL is used for all data storage.
4. Verify doctors/admins can access and review patient scans.
5. Confirm ports, WebSockets, and file paths are congruent.
6. Use .onnx model as specified.
7. Provide updated code snippets for each fix.
8. Test the fixes thoroughly before completion.
