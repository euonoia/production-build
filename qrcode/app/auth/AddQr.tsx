import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import { auth, db } from '../../FirebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import QRCode from 'react-native-qrcode-svg';

export default function AddQr() {
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        setError(null);
        const user = auth.currentUser;
        if (!user) {
          setInfo(null);
          setLoading(false);
          setError('No user logged in.');
          return;
        }
        const infoRef = doc(db, 'users', user.uid);
        const infoSnap = await getDoc(infoRef);
        if (infoSnap.exists()) {
          setInfo(infoSnap.data());
        } else {
          setInfo(null);
          setError('No information found for current user.');
        }
      } catch (err) {
        setInfo(null);
        setError('Error fetching info.');
        console.log('Error fetching info:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text>{error}</Text>
      </View>
    );
  }

  if (!info) {
    return (
      <View style={styles.center}>
        <Text>No information found for current user.</Text>
      </View>
    );
  }

  // Prepare QR data as a string with only the required fields, including userId
  const qrData = JSON.stringify({
    userId: auth.currentUser?.uid || '',
    firstName: info.firstName || '',
    lastName: info.lastName || '',
    email: info.email || '',
    contact: info.contact || '',
  });

  return (
    <View style={styles.center}>
      <Text style={styles.title}>Your Information QR</Text>
      <QRCode value={qrData} size={220} />
      <Text style={styles.infoText}>{qrData}</Text>
      <Text style={{marginTop: 10, fontWeight: 'bold'}}>User ID: {auth.currentUser?.uid}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  infoText: {
    marginTop: 20,
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
  },
});