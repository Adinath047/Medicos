import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { Avatar } from '../../components/common/Avatar';
import { Badge, getStatusBadgeVariant } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { DOCTORS } from '../../data/mockData';

export default function PatientDoctorsScreen({ navigation }: any) {
  const [search, setSearch] = useState('');
  const filtered = DOCTORS.filter(
    (d) =>
      d.status === 'Active' &&
      (!search.trim() ||
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.specialization.toLowerCase().includes(search.toLowerCase())),
  );

  const handleBook = (doctor: typeof DOCTORS[0]) => {
    Alert.alert(
      `Book with ${doctor.name}`,
      `${doctor.specialization}\n\nPick from available slots:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Book Appointment',
          onPress: () => Alert.alert('✅ Appointment Requested!', 'You will receive a confirmation shortly.'),
        },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Find a Doctor</Text>
        <Text style={styles.subtitle}>{filtered.length} available</Text>
      </View>

      <View style={styles.searchWrap}>
        <Text>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or specialization…"
          placeholderTextColor={Colors.textLight}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: d }) => (
          <View style={styles.card}>
            <Avatar uri={d.photoURL} name={d.name} size={56} />
            <View style={styles.info}>
              <Text style={styles.docName}>{d.name}</Text>
              <Text style={styles.spec}>{d.specialization}</Text>
              <Text style={styles.exp}>{d.experience} years experience</Text>
              <View style={styles.schedRow}>
                {d.schedule.slice(0, 2).map((s, i) => (
                  <View key={i} style={styles.schedChip}>
                    <Text style={styles.schedText}>{s.day} {s.startTime}</Text>
                  </View>
                ))}
              </View>
            </View>
            <Button
              label="Book"
              size="sm"
              onPress={() => handleBook(d)}
              style={{ alignSelf: 'flex-start' }}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 3 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, marginHorizontal: 16, marginBottom: 12,
    borderRadius: Layout.radius, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    backgroundColor: Colors.surface, borderRadius: Layout.radiusLg,
    padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border,
    flexDirection: 'row', gap: 14, alignItems: 'flex-start', ...Layout.shadow,
  },
  info: { flex: 1 },
  docName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  spec: { fontSize: 13, color: Colors.primary, marginTop: 2 },
  exp: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  schedRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  schedChip: {
    backgroundColor: Colors.primaryLight, borderRadius: Layout.radiusFull,
    paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: Colors.primaryMid,
  },
  schedText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
});
