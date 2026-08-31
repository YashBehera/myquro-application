import { registerRootComponent } from 'expo';
import App from './App';

// expo's registerRootComponent registers the component as "main" in AppRegistry
// and also handles Expo-specific initialization. MainActivity.kt requests "main".
registerRootComponent(App);
