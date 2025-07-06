import { StyleSheet, TextInput, TouchableOpacity, Text, SafeAreaView, View, Alert } from 'react-native';
import React, { useState } from 'react';
import { Picker } from '@react-native-picker/picker'; // <-- Add this import
import { db } from '../../FirebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export default function Information() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [contact, setContact] = useState('');
  const [country, setCountry] = useState('');
  const auth = getAuth();
  const user = auth.currentUser;

  const handleSubmit = async () => {
    if (!firstName || !lastName || !age || !contact || !country) {
      Alert.alert('Please fill in all fields.');
      return;
    }
    if (!user) {
      Alert.alert('No user logged in.');
      return;
    }
    try {
      // Save to Information collection as before
      await setDoc(doc(db, 'Information', user.uid), {
        userId: user.uid,
        firstName,
        lastName,
        age,
        contact,
        country,
        email: user.email || '',
        createdAt: new Date()
      });

      // Save to Event/countries/{country}/users/{userId}
      await setDoc(
        doc(db, 'Event', country, 'users', user.uid),
        {
          userId: user.uid,
          firstName,
          lastName,
          age,
          contact,
          country,
          email: user.email || '',
          eventTime: new Date()
        }
      );

      Alert.alert('Information saved!');
      setFirstName('');
      setLastName('');
      setAge('');
      setContact('');
      setCountry('');
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
        {/* Country Dropdown */}
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={country}
            onValueChange={(itemValue) => setCountry(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="Select Country" value="" />
            <Picker.Item label="South Korea" value="south_korea" />
            <Picker.Item label="Japan" value="japan" />
            <Picker.Item label="USA" value="usa" />
            <Picker.Item label="Philippines" value="philippines" />
            <Picker.Item label="Thailand" value="thailand" />
          </Picker>
        </View>
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
  pickerContainer: {
    width: '100%',
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 9,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    height: 50,
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