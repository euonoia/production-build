import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'; 
import React from 'react';
import { auth } from '@/FirebaseConfig';
import { getAuth } from 'firebase/auth';
import { router } from 'expo-router';

export default function index() {
  getAuth().onAuthStateChanged((user) => {
    if (!user) router.replace('/Login');

  });
  return (
    <View style={styles.container}>
      <Text>Sign Out </Text>
      <TouchableOpacity onPress={() => auth.signOut()}>
        <Text>Sign Out</Text>
      </TouchableOpacity>
    </View> 
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});