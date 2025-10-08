import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator } from 'react-native';
import { db } from '../FirebaseConfig';
import { collection, getDocs, query, where, getDoc, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const FriendList = forwardRef((props, ref) => {
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const user = auth.currentUser;

  const fetchFriends = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch only accepted friendships that include this user
      const q = query(
        collection(db, 'friendships'),
        where('users', 'array-contains', user.uid),
        where('status', '==', 'accepted')
      );
      const snapshot = await getDocs(q);
      const arr: any[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const otherUserId = data.users.find((u: string) => u !== user.uid);
        if (otherUserId) arr.push({ friendUid: otherUserId });
      });

      // Fetch friend profile data
      const friendsWithInfo = await Promise.all(
        arr.map(async (f) => {
          const userDoc = await getDoc(doc(db, 'users', f.friendUid));
          return { ...f, friendInfo: userDoc.data() };
        })
      );

      setFriends(friendsWithInfo);
    } catch (err) {
      console.log('Error fetching friends:', err);
      setFriends([]);
    } finally {
      setLoading(false);
    }
  };

  // Allow parent component to manually refresh
  useImperativeHandle(ref, () => ({ refresh: fetchFriends }));

  useEffect(() => {
    fetchFriends();
  }, [user]);

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  if (friends.length === 0)
    return (
      <View style={styles.container}>
        <Text>No friends found.</Text>
      </View>
    );

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
            <Text>Country: {item.friendInfo?.country || '-'}</Text>
          </View>
        )}
      />
    </View>
  );
});

export default FriendList;

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
