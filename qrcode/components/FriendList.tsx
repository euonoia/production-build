import { StyleSheet, Text, View, FlatList, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import { db } from '../FirebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export default function FriendList() {
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    const fetchFriends = async () => {
      if (!user) {
        setFriends([]);
        setLoading(false);
        return;
      }
      try {
        const q = query(collection(db, 'friend'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const friendArr: any[] = [];
        querySnapshot.forEach((doc) => {
          friendArr.push(doc.data());
        });
        setFriends(friendArr);
      } catch (error) {
        setFriends([]);
      }
      setLoading(false);
    };
    fetchFriends();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (friends.length === 0) {
    return (
      <View style={styles.container}>
        <Text>No friends found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Friend List</Text>
      <FlatList
        data={friends}
        keyExtractor={(_, idx) => idx.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>
              {item.friendInfo?.firstName || 'Unknown'} {item.friendInfo?.lastName || ''}
            </Text>
            <Text>Email: {item.friendInfo?.email || '-'}</Text>
            <Text>Contact: {item.friendInfo?.contact || '-'}</Text>
            <Text>User ID: {item.friendUid}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  card: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  name: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
});