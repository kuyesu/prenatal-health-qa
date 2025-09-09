import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  ViewStyle,
  ScrollViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface KeyboardAwareContainerProps extends ScrollViewProps {
  children: React.ReactNode;
  containerStyle?: ViewStyle;
  scrollEnabled?: boolean;
  enableOnAndroid?: boolean;
}

export const KeyboardAwareContainer: React.FC<KeyboardAwareContainerProps> = ({
  children,
  containerStyle,
  scrollEnabled = true,
  enableOnAndroid = true,
  ...scrollViewProps
}) => {
  const insets = useSafeAreaInsets();
  const keyboardVerticalOffset = Platform.OS === 'ios' ? insets.bottom : 0;
  
  return (
    <SafeAreaView style={[{ flex: 1 }, containerStyle]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : enableOnAndroid ? 'height' : undefined}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        {scrollEnabled ? (
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            {...scrollViewProps}
          >
            {children}
          </ScrollView>
        ) : (
          children
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
