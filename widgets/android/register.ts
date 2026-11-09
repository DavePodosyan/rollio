import { registerWidgetConfigurationScreen, registerWidgetTaskHandler } from 'react-native-android-widget';
import { RollWidgetSettings } from './RollWidgetSettings';
import { widgetTaskHandler } from './widget-task-handler';

// Android calls this headless task to draw the home screen widgets.
registerWidgetTaskHandler(widgetTaskHandler);
// ...and opens this screen for a widget's own settings (which roll it shows).
registerWidgetConfigurationScreen(RollWidgetSettings);
