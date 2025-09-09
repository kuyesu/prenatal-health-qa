import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
  StyleSheet,
  Image,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { KeyboardAwareContainer } from '../components/KeyboardAwareContainer';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../utils/storage';
import { apiService } from '../utils/apiService';
import { LANGUAGE_SPECIFIC_SUGGESTIONS } from '../constants';
import { Question, Language } from '../types';

interface MainChatScreenProps {
  onLogout: () => void;
}

export const MainChatScreen: React.FC<MainChatScreenProps> = ({ onLogout }) => {
  const [messages, setMessages] = useState<Question[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const language = (user?.preferredLanguage || 'en') as Language;
  const suggestions = LANGUAGE_SPECIFIC_SUGGESTIONS[language];

  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const history = await storage.getChatHistory();
      setMessages(history);
      setShowSuggestions(history.length === 0);
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const getMockResponse = (question: string, language: Language) => {
    const responses: Record<string, Record<string, string>> = {
      en: {
        default: "Thank you for your question about prenatal health. Based on current medical guidelines, I'd recommend discussing this with your healthcare provider for personalized advice. In the meantime, here are some general considerations that might be helpful.",
        vitamins: "Prenatal vitamins are essential during pregnancy. Key nutrients include folic acid (400-800mcg), iron (27mg), calcium (1000mg), and DHA. Always consult your doctor before starting any supplements.",
        checkups: "Regular prenatal checkups are typically scheduled every 4 weeks until 28 weeks, every 2 weeks until 36 weeks, then weekly until delivery. Your healthcare provider may adjust this schedule based on your specific needs.",
        foods: "Avoid raw or undercooked meats, unpasteurized dairy, high-mercury fish, raw eggs, and limit caffeine. Focus on fruits, vegetables, whole grains, lean proteins, and plenty of water.",
      },
      sw: {
        default: "Asante kwa swali lako kuhusu afya ya kabla ya kuzaa. Kulingana na miongozo ya kitiba ya sasa, napendekeza uzungumze na mtoa huduma wa afya wako kwa ushauri binafsi.",
        vitamins: "Vitamini za kabla ya kuzaa ni muhimu wakati wa ujauzito. Virutubisho muhimu ni pamoja na asidi ya folik, chuma, kalsi, na DHA. Daima zunguza na daktari wako kabla ya kuanza virutubisho vyovyote.",
        checkups: "Ukaguzi wa kawaida wa kabla ya kuzaa huandaliwa kila wiki 4 hadi wiki 28, kila wiki 2 hadi wiki 36, kisha kila wiki hadi kujifungua.",
        foods: "Epuka nyama mbichi au zisizopikwa vizuri, maziva yasiyotiwa kabla, samaki wenye zebaki nyingi, mayai mbichi, na punguza kahawa.",
      },
      lg: {
        default: "Webale okubuuza ku by'obulamu bw'abakazi abazito. Okusinziira ku mateeka ga leero ag'ebyobulagirizi, nkuwa amagezi ogenze ku musawo wo okufuna ebiragiro ebyakuwawukanya.",
        vitamins: "Vitamini z'abakazi abazito za mugaso nnyo mu kiseera ky'olubuto. Ebiruungo ebikulu mwe mulimu folic acid, ekyuma, calcium, ne DHA.",
        checkups: "Okugenda ku musawo olunaku lwa sabbiiti 4 okutuusa ku ssabbiiti 28, oluvannyuma sabbiiti 2 okutuusa ku 36, oluvannyuma buli sabbiiti okutuusa ku kuzaala.",
        foods: "Weekweke ennyama empi oba etafumbiddwa bulungi, amata agataayizibbwa, ebyennyanja ebirina akabwa kangi, amagi amabi, era kendeeza ku kaawa.",
      },
      rny: {
        default: "Turagushabasize kukubaza aha by'amagara g'abakaziabaziito. Kureeberera eby'ebyendegyerezi by'oku mugurezi, turakushaburira kugarukira omushuhuzi wawe kuhikya obwenkya bwawe.",
        vitamins: "Vitamini z'abakaziabaziito ni za maani nyingi omu kiseera ky'enda. Ebirurungo ebi ni by'amaani haramu folic acid, ekyuma, calcium, na DHA.",
        checkups: "Kugenda oku mushuhuzi sabiiti 4 kukabona okuika sabiiti 28, enyuma sabiiti 2 kukabona okuika 36, enyuma buri sabiiti okutunga ku kuzaara.",
        foods: "Olembe enyama etari mukwewu kandi etaafumbiddwe obwenda, amata agataayizabwemu, ebyenyanja ebirikumura akabwa kangi, amagi amabi, era otembe kaawa.",
      },
    };

    const langResponses = responses[language] || responses.en;
    
    // Simple keyword matching for demo
    if (question.toLowerCase().includes('vitamin')) {
      return langResponses.vitamins;
    } else if (question.toLowerCase().includes('checkup') || question.toLowerCase().includes('visit')) {
      return langResponses.checkups;
    } else if (question.toLowerCase().includes('food') || question.toLowerCase().includes('eat')) {
      return langResponses.foods;
    }
    
    return langResponses.default;
  };

  const handleSendMessage = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText) return;

    setIsLoading(true);
    setShowSuggestions(false);
    setInputText('');
    
    // Dismiss keyboard
    Keyboard.dismiss();

    const userMessage: Question = {
      id: Date.now().toString(),
      text: messageText,
      language,
      response: '',
      suggestedQuestions: [],
      createdAt: new Date().toISOString(),
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    scrollToBottom();

    try {
      // Try API call first
  const response = await apiService.sendMessage(messageText);

      const apiResponse = response.data?.message || response.data?.response || "I'm sorry, I couldn't process your question. Please try again.";
      const suggestions = LANGUAGE_SPECIFIC_SUGGESTIONS[language].slice(0, 3);

      const completedMessage: Question = {
        ...userMessage,
        response: apiResponse,
        suggestedQuestions: suggestions,
      };

      setMessages(prev => 
        prev.map(msg => msg.id === userMessage.id ? completedMessage : msg)
      );

      // Save to storage
      await storage.addChatMessage(completedMessage);
      scrollToBottom();

    } catch (error) {
      console.error('API call failed, using fallback response:', error);
      
      // Fallback to mock response
      await new Promise(resolve => setTimeout(resolve, 1000));

  const mockResponse = getMockResponse(messageText, 'en');
      const suggestions = LANGUAGE_SPECIFIC_SUGGESTIONS[language].slice(0, 3);

      const completedMessage: Question = {
        ...userMessage,
        response: mockResponse,
        suggestedQuestions: suggestions,
      };

      setMessages(prev => 
        prev.map(msg => msg.id === userMessage.id ? completedMessage : msg)
      );

      // Save to storage
      await storage.addChatMessage(completedMessage);
      scrollToBottom();
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (message: Question, index: number) => (
    <View key={message.id} style={styles.messageContainer}>
      {/* User Message */}
      <View style={styles.userMessage}>
        <View style={styles.userHeader}>
          <Text style={styles.userLabel}>You</Text>
        </View>
        <Text style={styles.userMessageText}>{message.text}</Text>
      </View>

      {/* AI Response */}
      {message.response ? (
        <View style={styles.aiMessage}>
          <View style={styles.aiHeader}>
            <Image 
              source={require('../assets/icon.png')} 
              style={styles.aiAvatar}
            />
            <Text style={styles.aiLabel}>Prenatal Health Assistant</Text>
          </View>
          <Text style={styles.aiMessageText}>{message.response}</Text>
          
          {/* Suggested Questions */}
          {message.suggestedQuestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsLabel}>Suggested questions:</Text>
              {message.suggestedQuestions.map((suggestion, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.suggestionButton}
                  onPress={() => handleSendMessage(suggestion)}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.aiMessage}>
          <View style={styles.aiHeader}>
            <Image 
              source={require('../assets/icon.png')} 
              style={styles.aiAvatar}
            />
            <Text style={styles.aiLabel}>Prenatal Health Assistant</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#00bfff" />
            <Text style={styles.loadingText}>Thinking...</Text>
          </View>
        </View>
      )}
    </View>
  );

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: onLogout }
      ]
    );
  };

  return (
    <View style={[styles.mainContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image 
            source={require('../assets/icon.png')} 
            style={styles.headerLogo}
          />
          <Text style={styles.headerTitle}>Prenatal Health</Text>
        </View>
        <TouchableOpacity style={{
            paddingHorizontal: 12,
        }} onPress={handleLogout}>
          <Ionicons name="power-outline" size={24} color="gray" />
        </TouchableOpacity>
      </View>

      <KeyboardAwareContainer 
        containerStyle={styles.container}
        scrollEnabled={false}
      >

      {/* Messages */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {showSuggestions && messages.length === 0 && (
          <View style={styles.welcomeContainer}>
            <Image 
              source={require('../assets/icon.png')} 
              style={styles.welcomeLogo}
            />
            <Text style={styles.welcomeTitle}>Welcome, {user?.name}!</Text>
            <Text style={styles.welcomeSubtitle}>
              Ask me anything about prenatal health, pregnancy, or childcare
            </Text>
            
            <View style={styles.initialSuggestions}>
              <Text style={styles.suggestionsLabel}>Try asking:</Text>
              {suggestions.slice(0, 3).map((suggestion, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.welcomeSuggestionButton}
                  onPress={() => handleSendMessage(suggestion)}
                >
                  <Text style={styles.welcomeSuggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {messages.map(renderMessage)}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputWrapper}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inputContainer}>
            <Input
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask about prenatal health..."
              multiline
              containerStyle={styles.inputField}
              returnKeyType="send"
              onSubmitEditing={() => handleSendMessage()}
              blurOnSubmit={false}
            />
            <Button
              title={isLoading ? "..." : "Send"}
              onPress={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
              style={styles.sendButton}
            />
          </View>
        </TouchableWithoutFeedback>
      </View>
    </KeyboardAwareContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    backgroundColor: '#f8fafc',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  welcomeLogo: {
    width: 80,
    height: 80,
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
  },
  initialSuggestions: {
    width: '100%',
  },
  welcomeSuggestionButton: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  welcomeSuggestionText: {
    fontSize: 16,
    color: '#0f172a',
    textAlign: 'center',
  },
  messageContainer: {
    marginBottom: 24,
    width: '100%',
  },
  userMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  userHeader: {
    marginBottom: 8,
  },
  userLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
  },
  userMessageText: {
    color: '#0f172a',
    fontSize: 16,
    lineHeight: 22,
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiAvatar: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  aiLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  aiMessageText: {
    fontSize: 16,
    color: '#0f172a',
    lineHeight: 24,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#64748b',
  },
  suggestionsContainer: {
    marginTop: 16,
  },
  suggestionsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#00bfff',
    marginBottom: 8,
  },
  suggestionButton: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#00bfff22',
  },
  suggestionText: {
    fontSize: 14,
    color: '#00bfff',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'flex-end',
  },
  inputWrapper: {
    backgroundColor: '#ffffff',
  },
  inputField: {
    flex: 1,
    marginRight: 12,
    marginBottom: 0,
  },
  sendButton: {
    paddingHorizontal: 24,
  },
});

 