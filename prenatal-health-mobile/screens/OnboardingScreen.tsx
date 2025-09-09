import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { KeyboardAwareContainer } from '../components/KeyboardAwareContainer';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../utils/storage';
import { 
  ONBOARDING_QUESTIONS, 
  HEALTH_CONDITIONS_OPTIONS, 
  PREGNANCY_CONCERNS_OPTIONS,
  LANGUAGE_NAMES 
} from '../constants';
import { Language, OnboardingData } from '../types';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(false);
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState<Partial<OnboardingData>>({
    preferredLanguage: 'en',
    healthConditions: [],
    concerns: [],
    name: user?.name || '', // Pre-populate with user's name from registration
  });

  const questions = ONBOARDING_QUESTIONS[selectedLanguage];
  const totalSteps = 8;

  // Update form data when user data becomes available
  useEffect(() => {
    if (user?.name && !formData.name) {
      setFormData(prev => ({ ...prev, name: user.name }));
    }
  }, [user?.name, formData.name]);

  const updateFormData = (field: keyof OnboardingData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: 'healthConditions' | 'concerns', item: string) => {
    const currentArray = formData[field] || [];
    const newArray = currentArray.includes(item)
      ? currentArray.filter(i => i !== item)
      : [...currentArray, item];
    updateFormData(field, newArray);
  };

  const validateStep = () => {
    switch (currentStep) {
      case 1: // Name
        return formData.name?.trim();
      case 2: // Age
        return formData.age && formData.age > 0 && formData.age < 100;
      case 3: // Pregnancy week
        return formData.pregnancyWeek && formData.pregnancyWeek > 0 && formData.pregnancyWeek <= 42;
      case 4: // Due date
        return formData.dueDate?.trim();
      case 5: // Previous pregnancies
        return formData.previousPregnancies !== undefined && formData.previousPregnancies >= 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep()) {
      Alert.alert('Please complete this step', 'All fields are required to continue.');
      return;
    }

    Keyboard.dismiss();

    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    try {
      setIsLoading(true);
      
      const completeData: OnboardingData = {
        name: formData.name || '',
        age: formData.age || 0,
        pregnancyWeek: formData.pregnancyWeek || 0,
        dueDate: formData.dueDate || '',
        previousPregnancies: formData.previousPregnancies || 0,
        healthConditions: formData.healthConditions || [],
        concerns: formData.concerns || [],
        preferredLanguage: selectedLanguage,
      };

      await storage.setOnboardingData(completeData);
      await updateProfile({
        profileCompleted: true,
        pregnancyWeek: completeData.pregnancyWeek,
        dueDate: completeData.dueDate,
        preferredLanguage: completeData.preferredLanguage,
      });

      onComplete();
    } catch (error) {
      Alert.alert('Error', 'Failed to save your information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderLanguageSelector = () => (
    <View style={styles.optionsContainer}>
      {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
        <TouchableOpacity
          key={code}
          style={[
            styles.optionButton,
            selectedLanguage === code && styles.selectedOption
          ]}
          onPress={() => {
            setSelectedLanguage(code as Language);
            updateFormData('preferredLanguage', code as Language);
          }}
        >
          <Text style={[
            styles.optionText,
            selectedLanguage === code && styles.selectedOptionText
          ]}>
            {name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderMultiSelect = (
    options: string[],
    field: 'healthConditions' | 'concerns'
  ) => (
    <View style={styles.optionsContainer}>
      {options.map((option, index) => {
        const isSelected = (formData[field] || []).includes(option);
        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.optionButton,
              isSelected && styles.selectedOption
            ]}
            onPress={() => toggleArrayItem(field, option)}
          >
            <Text style={[
              styles.optionText,
              isSelected && styles.selectedOptionText
            ]}>
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderStepContent = () => {
    const needsKeyboard = [1, 2, 3, 4, 5].includes(currentStep);

    const content = (() => {
      switch (currentStep) {
        case 0: // Language Selection
          return (
            <View>
              <Text style={styles.question}>{questions.language}</Text>
              {renderLanguageSelector()}
            </View>
          );
        
        case 1: // Name
          return (
            <View>
              <Text style={styles.question}>{questions.name}</Text>
              <Text style={styles.subtext}>You can edit your name if needed</Text>
              <Input
                value={formData.name || ''}
                onChangeText={(value) => updateFormData('name', value)}
                placeholder={user?.name || "Enter your name"}
                returnKeyType="done"
                onSubmitEditing={handleNext}
                autoCorrect={false}
                autoFocus={!formData.name} // Auto focus if no name is pre-filled
              />
            </View>
          );

        case 2: // Age
          return (
            <View>
              <Text style={styles.question}>{questions.age}</Text>
              <Input
                value={formData.age?.toString() || ''}
                onChangeText={(value) => updateFormData('age', parseInt(value) || 0)}
                placeholder="25"
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={handleNext}
              />
            </View>
          );

        case 3: // Pregnancy Week
          return (
            <View>
              <Text style={styles.question}>{questions.pregnancyWeek}</Text>
              <Input
                value={formData.pregnancyWeek?.toString() || ''}
                onChangeText={(value) => updateFormData('pregnancyWeek', parseInt(value) || 0)}
                placeholder="12"
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={handleNext}
              />
            </View>
          );

        case 4: // Due Date
          return (
            <View>
              <Text style={styles.question}>{questions.dueDate}</Text>
              <Input
                value={formData.dueDate || ''}
                onChangeText={(value) => updateFormData('dueDate', value)}
                placeholder="YYYY-MM-DD"
                returnKeyType="done"
                onSubmitEditing={handleNext}
              />
            </View>
          );

        case 5: // Previous Pregnancies
          return (
            <View>
              <Text style={styles.question}>{questions.previousPregnancies}</Text>
              <Input
                value={formData.previousPregnancies?.toString() || ''}
                onChangeText={(value) => updateFormData('previousPregnancies', parseInt(value) || 0)}
                placeholder="0"
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={handleNext}
              />
            </View>
          );

        case 6: // Health Conditions
          return (
            <View>
              <Text style={styles.question}>{questions.healthConditions}</Text>
              <Text style={styles.subtext}>Select all that apply</Text>
              {renderMultiSelect(HEALTH_CONDITIONS_OPTIONS[selectedLanguage], 'healthConditions')}
            </View>
          );

        case 7: // Concerns
          return (
            <View>
              <Text style={styles.question}>{questions.concerns}</Text>
              <Text style={styles.subtext}>Select all that apply</Text>
              {renderMultiSelect(PREGNANCY_CONCERNS_OPTIONS[selectedLanguage], 'concerns')}
            </View>
          );

        default:
          return null;
      }
    })();

    if (needsKeyboard) {
      return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.stepContent}>
            {content}
          </View>
        </TouchableWithoutFeedback>
      );
    }

    return <View style={styles.stepContent}>{content}</View>;
  };

  return (
    <KeyboardAwareContainer 
      containerStyle={styles.container}
      scrollEnabled={[6, 7].includes(currentStep)} // Only scroll for option lists
    >
      <View style={styles.header}>
        <Text style={styles.title}>{questions.welcome}</Text>
        <Text style={styles.subtitle}>{questions.subtitle}</Text>
        
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentStep + 1) / totalSteps) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {currentStep + 1} of {totalSteps}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {renderStepContent()}
      </View>

      <View style={styles.footer}>
        {currentStep > 0 && (
          <Button
            title="Back"
            variant="outline"
            onPress={() => {
              Keyboard.dismiss();
              setCurrentStep(currentStep - 1);
            }}
            style={styles.backButton}
            disabled={isLoading}
          />
        )}
        <Button
          title={currentStep === totalSteps - 1 ? "Complete" : "Next"}
          onPress={handleNext}
          style={styles.nextButton}
          disabled={isLoading}
          loading={isLoading && currentStep === totalSteps - 1}
        />
      </View>

      {/* Loading overlay for better UX */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00bfff" />
            <Text style={styles.loadingText}>Completing your profile...</Text>
          </View>
        </View>
      )}
    </KeyboardAwareContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00bfff',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#64748b',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
  },
  question: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  selectedOption: {
    borderColor: '#00bfff',
    backgroundColor: '#00bfff11',
  },
  optionText: {
    fontSize: 16,
    color: '#0f172a',
    textAlign: 'center',
  },
  selectedOptionText: {
    color: '#00bfff',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    gap: 16,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
  },
});
