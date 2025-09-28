#!/usr/bin/env python3
"""
Simple script to run the FastAPI server directly without uvicorn command line issues.
"""
import uvicorn
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    print("Starting Lecture Navigator backend server...")
    print("Server will be available at: http://127.0.0.1:8000")
    print("Press Ctrl+C to stop the server")
    
    try:
        uvicorn.run(
            "app.main:app", 
            host="127.0.0.1", 
            port=8000, 
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)