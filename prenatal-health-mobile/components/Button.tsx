import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps, StyleSheet } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  style,
  disabled,
  ...props
}) => {
  const getButtonStyle = () => {
    const baseStyle = { ...styles.button };
    
    if (variant === 'primary') {
      Object.assign(baseStyle, styles.primaryButton);
    } else if (variant === 'secondary') {
      Object.assign(baseStyle, styles.secondaryButton);
    } else if (variant === 'outline') {
      Object.assign(baseStyle, styles.outlineButton);
    }
    
    if (size === 'small') {
      Object.assign(baseStyle, styles.smallButton);
    } else if (size === 'large') {
      Object.assign(baseStyle, styles.largeButton);
    }
    
    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = { ...styles.text };
    
    if (variant === 'primary') {
      Object.assign(baseStyle, styles.primaryText);
    } else {
      Object.assign(baseStyle, styles.secondaryText);
    }
    
    if (size === 'small') {
      Object.assign(baseStyle, styles.smallText);
    } else if (size === 'large') {
      Object.assign(baseStyle, styles.largeText);
    }
    
    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={[
        getButtonStyle(),
        { opacity: disabled || loading ? 0.6 : 1 },
        style
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? 'white' : '#00bfff'} />
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryButton: {
    backgroundColor: '#00bfff',
  },
  secondaryButton: {
    backgroundColor: '#7dd3fc33',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#00bfff',
  },
  smallButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  largeButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 16,
  },
  primaryText: {
    color: 'white',
  },
  secondaryText: {
    color: '#00bfff',
  },
  smallText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 18,
  },
});
