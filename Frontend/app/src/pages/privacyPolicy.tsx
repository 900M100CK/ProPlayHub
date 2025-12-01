import React from 'react';
import {ScrollView, View, Text, StyleSheet, StatusBar } from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import { colors, spacing, radius } from '../styles/theme';

const sections = [
  {
    title: 'Information we collect',
    body:
      'We collect account details (name, email, username), usage data, and device info to provide and improve ProPlayHub services.',
  },
  {
    title: 'How we use your data',
    body:
      'Data is used to personalize your experience, process purchases, provide support, and improve our products. We do not sell your personal data.',
  },
  {
    title: 'Sharing',
    body:
      'We may share data with trusted providers for payments, analytics, and notifications. These partners are required to protect your data.',
  },
  {
    title: 'Security',
    body:
      'We use encryption in transit and industry best practices to safeguard your information. No system is 100% secure, so please use a strong password.',
  },
  {
    title: 'Your choices',
    body:
      'You can update your profile, change your password, and request data deletion by contacting support. Notification preferences can be adjusted in the app.',
  },
  {
    title: 'Contact',
    body:
      'For privacy questions, reach out at privacy@proplayhub.com. We will respond as soon as possible.',
  },
];

const PrivacyPolicyScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScreenHeader title="Privacy Policy" showBackButton />

      <View style={styles.body}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.heading}>Our commitment to your privacy</Text>
          <Text style={styles.subtitle}>
            We respect your data. This page outlines what we collect, how we use it, and your choices.
          </Text>

          {sections.map((section) => (
            <View key={section.title} style={styles.card}>
              <Text style={styles.cardTitle}>{section.title}</Text>
              <Text style={styles.cardBody}>{section.body}</Text>
            </View>
          ))}

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default PrivacyPolicyScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.headerBackground,
  },
  body: {
    flex: 1,
    backgroundColor: colors.bodyBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.md,
    paddingBottom: 80,
    marginBottom: -50,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  cardBody: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
