import { registerRootComponent } from 'expo';
import App from './App';

import { StyleSheet } from 'react-native';
if (StyleSheet && !StyleSheet.absoluteFillObject) {
  StyleSheet.absoluteFillObject = StyleSheet.absoluteFill;
}

// expo's registerRootComponent registers the component as "main" in AppRegistry
// and also handles Expo-specific initialization. MainActivity.kt requests "main".
registerRootComponent(App);
