@echo off
title ManipTrain Offline Simulator
echo ============================================================
echo   ManipTrain - 6-DOF Delayed-Teleoperation Trainer
echo ============================================================
echo Starting local offline web server on port 8080...
start "" "http://localhost:8080"
python run_offline.py
pause
