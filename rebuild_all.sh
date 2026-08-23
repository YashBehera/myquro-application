#!/bin/bash
set -e

echo "Cleaning and Building MyQuroRider..."
cd site2android-pro/MyQuroRider/android
./gradlew clean assembleRelease
cd ../../../

echo "Cleaning and Building react-native-customer..."
cd site2android-pro/react-native-customer/android
./gradlew clean assembleRelease
cd ../../../

echo "Cleaning and Building react-native-merchant..."
cd site2android-pro/react-native-merchant/android
./gradlew clean assembleRelease
cd ../../../

echo "All builds completed successfully!"
