import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadii } from '../../constants/theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled,
  style,
  textStyle,
  ...rest
}) => {
  const getContainerStyle = (): ViewStyle => {
    let base: ViewStyle = styles.button;

    switch (variant) {
      case 'primary':
        base = { ...base, backgroundColor: Colors.primary.main };
        break;
      case 'secondary':
        base = { ...base, backgroundColor: Colors.secondary.main };
        break;
      case 'outline':
        base = {
          ...base,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: Colors.primary.main,
        };
        break;
      case 'ghost':
        base = { ...base, backgroundColor: 'transparent' };
        break;
    }

    switch (size) {
      case 'small':
        base = { ...base, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm };
        break;
      case 'medium':
        base = { ...base, paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.md };
        break;
      case 'large':
        base = { ...base, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg };
        break;
    }

    if (disabled || loading) {
      base = { ...base, opacity: 0.6 };
    }

    return base;
  };

  const getTextStyle = (): TextStyle => {
    let base: TextStyle = styles.text;

    switch (variant) {
      case 'outline':
      case 'ghost':
        base = { ...base, color: Colors.primary.main };
        break;
      default:
        base = { ...base, color: Colors.neutral.white };
        break;
    }

    switch (size) {
      case 'small':
        base = { ...base, fontSize: Typography.sizes.sm };
        break;
      case 'medium':
        base = { ...base, fontSize: Typography.sizes.md };
        break;
      case 'large':
        base = { ...base, fontSize: Typography.sizes.lg };
        break;
    }

    return base;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || loading}
      style={[getContainerStyle(), style]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? Colors.primary.main : Colors.neutral.white}
          size="small"
        />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: BorderRadii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontWeight: Typography.weights.semiBold,
  },
});

export default Button;
