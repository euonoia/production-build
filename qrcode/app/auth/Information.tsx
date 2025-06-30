import { StyleSheet, TextInput, TouchableOpacity, Text, SafeAreaView, View, Alert } from 'react-native';
import React, { useState } from 'react';
import { db } from '../../FirebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export default function Information() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [contact, setContact] = useState('');
  const auth = getAuth();
  const user = auth.currentUser;

  const handleSubmit = async () => {
    if (!firstName || !lastName || !age || !contact) {
      Alert.alert('Please fill in all fields.');
      return;
    }
    if (!user) {
      Alert.alert('No user logged in.');
      return;
    }
    try {
      await setDoc(doc(db, 'Information', user.uid), {
        userId: user.uid,
        firstName,
        lastName,
        age,
        contact,
        email: user.email || '',
        createdAt: new Date()
      });
      Alert.alert('Information saved!');
      setFirstName('');
      setLastName('');
      setAge('');
      setContact('');
    } catch (error) {
      Alert.alert('Error saving information.');
      console.log(error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.mainTitle}>User Information</Text>
        <TextInput
          placeholder="First Name"
          value={firstName}
          onChangeText={setFirstName}
          style={styles.input}
        />
        <TextInput
          placeholder="Last Name"
          value={lastName}
          onChangeText={setLastName}
          style={styles.input}
        />
        <TextInput
          placeholder="Age"
          value={age}
          onChangeText={setAge}
          style={styles.input}
          keyboardType="numeric"
        />
        <TextInput
          placeholder="Contact"
          value={contact}
          onChangeText={setContact}
          style={styles.input}
          keyboardType="phone-pad"
        />
        <TouchableOpacity style={styles.addButton} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Submit</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    padding: 10,
    width: '100%',
    marginBottom: 15,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  addButton: {
    padding: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFA726',
    shadowColor: '#FFA726',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 5,
    width: '100%',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});