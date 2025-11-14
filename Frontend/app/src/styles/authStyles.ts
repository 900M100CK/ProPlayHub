import { StyleSheet } from 'react-native';

export const homeStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#111827', // bg-gray-900
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // HEADER
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#374151',
  },
  notificationBtn: {
    padding: 8,
    backgroundColor: '#1F2937',
    borderRadius: 8,
  },

  // SEARCH
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 8,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#4B5563',
  },

  // QUICK ACTIONS
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionCard: {
    width: '23%',
    backgroundColor: '#1F2937',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionIcon: {
    marginBottom: 6,
    color: '#818CF8',
    fontSize: 20,
  },
  actionText: {
    fontSize: 12,
    color: '#E5E7EB',
    textAlign: 'center',
  },

  // SECTION TITLES
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: 12,
  },

  // DEAL CARDS
  dealCard: {
    backgroundColor: '#1F2937',
    width: 180,
    padding: 14,
    borderRadius: 12,
    marginRight: 12,
  },
  dealBadge: {
    backgroundColor: '#4F46E5',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  dealBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  dealTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: 6,
  },
  dealDesc: {
    fontSize: 12,
    color: '#9CA3AF',
  },

  // RECOMMENDED
  recommendedCard: {
    backgroundColor: '#1F2937',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  recommendedTitle: {
    color: '#E5E7EB',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  recommendedDesc: {
    color: '#9CA3AF',
    fontSize: 12,
  },

  // SOCIAL SHARE
  socialBox: {
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  socialText: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
  },
  socialButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  socialButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  socialButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export const authStyles = StyleSheet.create({
  // Layout
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#111827', // bg-gray-900
    justifyContent: 'center',
  },
  innerContainer: {
    paddingHorizontal: 20,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#818CF8', // text-indigo-400
  },
  subtitle: {
    color: '#9CA3AF', // text-gray-400
    marginTop: 8,
    textAlign: 'center',
  },

  // Messages (Error, Success)
  errorContainer: {
    backgroundColor: '#991B1B', // bg-red-800
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F87171',
    marginBottom: 16,
  },
  errorText: {
    color: '#FECACA', // text-red-200
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: '#065F46', // bg-green-800
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    color: '#D1FAE5', // text-green-100
    textAlign: 'center',
  },

  // Input Fields
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#D1D5DB', // text-gray-300
    marginBottom: 8,
  },
  input: {
    width: '100%',
    borderRadius: 8,
    backgroundColor: '#374151', // bg-gray-700
    padding: 12,
    color: '#FFFFFF', // text-white
    borderWidth: 1,
    borderColor: '#4B5563', // ring-gray-600
    fontSize: 14,
  },

  // Password Specific
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Buttons
  button: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#4F46E5', // bg-indigo-600
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8, // Thêm một chút khoảng cách trên
  },
  buttonDisabled: {
    backgroundColor: '#3730A3', // bg-indigo-800
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF', // text-white
  },

  // Bottom Links (Register, Login, Back)
  bottomLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  bottomLinkText: {
    fontSize: 14,
    color: '#9CA3AF', // text-gray-400
  },
  bottomLinkActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#818CF8', // text-indigo-400
  },

  // Remember Me (Login Screen specific, but can be here)
  rememberMeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberMeText: {
    color: '#D1D5DB', // text-gray-300
    marginLeft: 8,
    fontSize: 14,
  },
});

import React from 'react';

const DummyAuthStylesScreen = () => null;

export default DummyAuthStylesScreen;