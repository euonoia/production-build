import React, { useState } from 'react';
import {
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  View,
} from 'react-native';
import { auth, db } from '@/FirebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { router } from 'expo-router';

const countriesList = [
  'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany',
  'France', 'India', 'Philippines', 'Japan', 'South Korea',
];

export default function Register() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contact, setContact] = useState('');
  const [country, setCountry] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const role = 'user';

  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

 const handleRegister = async () => {
  if (!firstName || !lastName || !email || !password || !country) {
    alert('Please fill all required fields');
    return;
  }

  try {
    // 1️⃣ Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const now = new Date();

    const userData = {
      firstName,
      lastName,
      email,
      contact,
      country,
      role,
      createdAt: now,
      updatedAt: now,
    };

    // 2️⃣ Store in main users collection
    await setDoc(doc(db, 'users', user.uid), userData);

    // 3️⃣ Ensure event country document exists
    const normalizedCountry = country.toLowerCase().replace(/\s+/g, '_');
    const countryDocRef = doc(db, 'events', normalizedCountry);
    const countryDocSnap = await getDoc(countryDocRef);

    if (!countryDocSnap.exists()) {
      await setDoc(countryDocRef, {
        createdAt: now,
        updatedAt: now,
      });
    }

    // 5️⃣ Store user under /events/{country}/users with production-grade fields
    await setDoc(doc(db, 'events', normalizedCountry, 'users', user.uid), {
      ...userData,
      invited: false, // Initially false; can be updated by admin
      attendanceStatus: 'registered', // 'registered', 'checked_in', 'no_show'
      inviteSentAt: null, // Set timestamp when invitation is sent
      inviteAcceptedAt: null, // Set timestamp when user accepts invitation
      checkedInAt: null, // Set timestamp when QR is scanned
      eventTime: now, // When user registered for this event
      userId: user.uid,
      eventName: null,
    });

    alert('Registered successfully!');
    router.replace('/(tabs)');
  } catch (error: any) {
    alert('Registration failed: ' + error.message);
  }
};


  const filteredCountries = countriesList.filter(c =>
    c.toLowerCase().includes(searchText.toLowerCase())
  );

  const selectCountry = (c: string) => {
    setCountry(c);
    setModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Register</Text>

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
        placeholder="Contact"
        value={contact}
        onChangeText={setContact}
        style={styles.input}
      />

      {/* Country picker */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={[styles.input, { justifyContent: 'center' }]}
      >
        <Text style={{ color: country ? '#000' : '#999' }}>
          {country || 'Select Country'}
        </Text>
      </TouchableOpacity>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <TouchableOpacity onPress={handleRegister} style={styles.button}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>

      {/* Country Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <TextInput
              placeholder="Search country..."
              value={searchText}
              onChangeText={setSearchText}
              style={styles.searchInput}
            />
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => selectCountry(item)} style={styles.countryItem}>
                  <Text>{item}</Text>
                </TouchableOpacity>
              )}
              keyboardShouldPersistTaps="handled"
            />
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
              <Text style={{ color: '#fff' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
    borderRadius: 6,
  },
  buttonText: { color: '#fff', fontSize: 16 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    maxHeight: '80%',
    padding: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: 'gray',
    marginBottom: 8,
    paddingHorizontal: 8,
    height: 40,
  },
  countryItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    backgroundColor: '#007BFF',
    padding: 12,
    marginTop: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
});
