#!/bin/bash
set -e

echo "Building MyQuroRider..."
cd site2android-pro/MyQuroRider/android
./gradlew assembleRelease
cd ../../../

echo "Building react-native-customer..."
cd site2android-pro/react-native-customer/android
./gradlew assembleRelease
cd ../../../

echo "Building react-native-merchant..."
cd site2android-pro/react-native-merchant/android
./gradlew assembleRelease
cd ../../../

echo "All builds completed!"
