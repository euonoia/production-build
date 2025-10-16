import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import { auth, db } from '../../FirebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import QRCode from 'react-native-qrcode-svg';

// ✅ Safe Base64 encoder (no Node.js Buffer needed)
const encodeToBase64 = (text: string) => {
  return global.btoa(unescape(encodeURIComponent(text)));
};

export default function AddQr() {
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventStatus, setEventStatus] = useState<string | null>(null);

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

        // --- Fetch user info ---
        const infoRef = doc(db, 'users', user.uid);
        const infoSnap = await getDoc(infoRef);
        if (infoSnap.exists()) {
          const userInfo = infoSnap.data();
          setInfo(userInfo);

          // --- Check Event collection ---
          if (userInfo.country) {
            const eventDoc = await getDoc(doc(db, 'Event', userInfo.country, 'users', user.uid));
            if (eventDoc.exists()) {
              const eventData = eventDoc.data();
              const invited = eventData.invited ?? false;
              setEventStatus(
                invited
                  ? `✅ Invited\nName: ${userInfo.firstName} ${userInfo.lastName}\nCountry: ${userInfo.country}`
                  : `❌ Not Invited\nName: ${userInfo.firstName} ${userInfo.lastName}\nCountry: ${userInfo.country}`
              );
            } else {
              setEventStatus('User not registered for the event.');
            }
          } else {
            setEventStatus('No country info for event lookup.');
          }
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

  // ✅ Prepare and encode QR data safely
  const rawQrData = JSON.stringify({
    userId: auth.currentUser?.uid || '',
    firstName: info.firstName || '',
    lastName: info.lastName || '',
    email: info.email || '',
    contact: info.contact || '',
    country: info.country || '',
  });

  const qrData = encodeToBase64(rawQrData); // base64 encoded text

  return (
    <View style={styles.center}>
      <Text style={styles.title}>Your Information QR</Text>

      {/* ✅ Stable base64 QR (prints/scans perfectly) */}
      <QRCode value={qrData} size={220} />

      {/* ✅ Show readable info */}
      <View style={{ marginTop: 20 }}>
        <Text style={styles.nameText}>
          👤 {info.firstName} {info.lastName}
        </Text>
        <Text style={styles.detailText}>📧 {info.email}</Text>
        <Text style={styles.detailText}>📱 {info.contact}</Text>
        <Text style={styles.detailText}>🌍 {info.country}</Text>
      </View>

      {/* ✅ Invitation status */}
      <Text style={styles.status}>{eventStatus}</Text>

      <Text style={{ marginTop: 10, fontWeight: 'bold' }}>
        User ID: {auth.currentUser?.uid}
      </Text>
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
  nameText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  detailText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#555',
  },
  status: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
});
