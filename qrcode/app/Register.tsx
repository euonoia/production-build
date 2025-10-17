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
  ActivityIndicator,
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

  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false); // 🟢 new loading state

  const role = 'user';

  // 🟡 Main registration handler
  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password || !country) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setLoading(true); // 🟢 show loader
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
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'users', user.uid), userData);

      const normalizedCountry = country.toLowerCase().replace(/\s+/g, '_');
      const countryDocRef = doc(db, 'events', normalizedCountry);
      const countryDocSnap = await getDoc(countryDocRef);

      if (!countryDocSnap.exists()) {
        await setDoc(countryDocRef, {
          createdAt: now,
          updatedAt: now,
        });
      }

      await setDoc(doc(db, 'events', normalizedCountry, 'users', user.uid), {
        ...userData,
        invited: false,
        attendanceStatus: 'registered',
        inviteSentAt: null,
        inviteAcceptedAt: null,
        checkedInAt: null,
        eventTime: now,
        userId: user.uid,
        assignedEvent: null,
        qrcodePrinted:  null,
      });

      alert('Registered successfully!');
      router.replace('/(tabs)');
    } catch (error: any) {
      alert('Registration failed: ' + error.message);
    } finally {
      setLoading(false); // 🟢 hide loader
    }
  };

  // 🔍 Filter countries
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

      {/* 🌍 Country Picker */}
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

      {/* 🌐 Country Modal */}
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

      {/* 🌀 Loading Modal */}
      <Modal visible={loading} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#007BFF" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// 🧩 Styles
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
  // 🌀 Loading modal styles
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 10,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
});
