import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Switch, Animated, Alert, Linking,
  Modal, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestPermissions, scheduleDailyReminder, cancelReminder } from './notifications';
import {
  getLastTaken, setLastTaken,
  getStreak, setStreak,
  getReminderTime, setReminderTime,
  getReminderEnabled, setReminderEnabled,
  isSameDay, isYesterday,
} from './storage';

export default function HomeScreen() {
  const [takenToday, setTakenToday]           = useState(false);
  const [streak, setStreakState]               = useState(0);
  const [lastTaken, setLastTakenState]         = useState<Date | null>(null);
  const [reminderEnabled, setReminderEnabledState] = useState(false);
  const [reminderHour, setReminderHour]        = useState(9);
  const [reminderMinute, setReminderMinute]    = useState(0);
  const [showTimePicker, setShowTimePicker]    = useState(false);
  const [tempHour, setTempHour]               = useState(9);
  const [tempMinute, setTempMinute]           = useState(0);

  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.6)).current;
  const checkScale  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadData();
    startPulse();
  }, []);

  async function loadData() {
    const [last, s, time, enabled] = await Promise.all([
      getLastTaken(), getStreak(), getReminderTime(), getReminderEnabled(),
    ]);
    if (last) {
      setLastTakenState(last);
      setTakenToday(isSameDay(last, new Date()));
    }
    setStreakState(s);
    setReminderHour(time.hour);
    setReminderMinute(time.minute);
    setTempHour(time.hour);
    setTempMinute(time.minute);
    setReminderEnabledState(enabled);
  }

  function startPulse() {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim,   { toValue: 1.14, duration: 1300, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.05, duration: 1300, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim,   { toValue: 1,    duration: 1300, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.6,  duration: 1300, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }

  async function handleTake() {
    if (takenToday) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.sequence([
      Animated.timing(checkScale,  { toValue: 0.87, duration: 100, useNativeDriver: true }),
      Animated.spring(checkScale,  { toValue: 1,    friction: 4,   useNativeDriver: true }),
    ]).start();

    const now  = new Date();
    const last = await getLastTaken();
    const cur  = await getStreak();
    const newStreak = (last && isYesterday(last)) ? cur + 1 : 1;

    await setLastTaken(now);
    await setStreak(newStreak);
    setLastTakenState(now);
    setTakenToday(true);
    setStreakState(newStreak);
  }

  async function handleToggleReminder(value: boolean) {
    if (value) {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          'Notificaciones desactivadas',
          'Actívalas en Ajustes > Creatina > Notificaciones.',
          [
            { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() },
            { text: 'Cancelar', style: 'cancel' },
          ]
        );
        return;
      }
      await scheduleDailyReminder(reminderHour, reminderMinute);
    } else {
      await cancelReminder();
    }
    setReminderEnabledState(value);
    await setReminderEnabled(value);
  }

  async function handleSaveTime() {
    setReminderHour(tempHour);
    setReminderMinute(tempMinute);
    await setReminderTime(tempHour, tempMinute);
    if (reminderEnabled) await scheduleDailyReminder(tempHour, tempMinute);
    setShowTimePicker(false);
  }

  const fmt = (h: number, m: number) =>
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  return (
    <LinearGradient colors={['#0D0B1A', '#100820', '#0A0F28']} style={styles.root}>
      <SafeAreaView style={styles.safe}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Ionicons name="flash" size={24} color="#00CCFF" />
          <Text style={styles.title}>CREATINA</Text>
        </View>
        <Text style={[styles.subtitle, takenToday && styles.subtitleDone]}>
          {takenToday ? '¡Hoy ya la tomaste! 🎉' : 'Recuerda tomarla hoy'}
        </Text>

        {/* ── Botón principal ── */}
        <View style={styles.btnArea}>
          {!takenToday && (
            <Animated.View
              style={[styles.pulse, { transform: [{ scale: pulseAnim }], opacity: glowOpacity }]}
            />
          )}
          <Animated.View style={{ transform: [{ scale: checkScale }] }}>
            <TouchableOpacity onPress={handleTake} activeOpacity={takenToday ? 1 : 0.8}>
              <LinearGradient
                colors={takenToday ? ['#1A7A3C', '#0D4A25'] : ['#2B7FE8', '#7B1FA2']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.mainBtn}
              >
                <Ionicons
                  name={takenToday ? 'checkmark-circle' : 'fitness'}
                  size={58} color="white"
                />
                <Text style={styles.btnLabel}>{takenToday ? 'Tomada' : 'Tomar'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* ── Tarjeta inferior ── */}
        <View style={styles.cardWrap}>

          {/* Racha */}
          <View style={styles.row}>
            <Ionicons name="flame" size={16} color={streak > 0 ? '#FF8C00' : '#555'} />
            <Text style={[styles.streakTxt, streak === 0 && styles.dim]}>
              {streak} día{streak !== 1 ? 's' : ''} seguido{streak !== 1 ? 's' : ''}
            </Text>
            <View style={{ flex: 1 }} />
            {lastTaken && (
              <Text style={styles.dim}>
                Última: {lastTaken.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>

          {/* Toggle recordatorio */}
          <View style={styles.row}>
            <Ionicons name="notifications" size={16} color={reminderEnabled ? '#00CCFF' : '#555'} />
            <Text style={styles.rowLabel}>Recordatorio</Text>
            <View style={{ flex: 1 }} />
            <Switch
              value={reminderEnabled}
              onValueChange={handleToggleReminder}
              trackColor={{ false: '#333', true: '#005F7A' }}
              thumbColor={reminderEnabled ? '#00CCFF' : '#666'}
            />
          </View>

          {/* Hora del recordatorio */}
          {reminderEnabled && (
            <View style={styles.row}>
              <Ionicons name="time" size={15} color="#9C65D6" />
              <Text style={[styles.rowLabel, styles.dim]}>Hora</Text>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                onPress={() => { setTempHour(reminderHour); setTempMinute(reminderMinute); setShowTimePicker(true); }}
                style={styles.badge}
              >
                <Text style={styles.badgeTxt}>{fmt(reminderHour, reminderMinute)}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Modal selector de hora ── */}
        <Modal visible={showTimePicker} transparent animationType="slide">
          <View style={styles.overlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Elegir hora</Text>

              <View style={styles.pickerRow}>
                {/* Horas */}
                <View style={styles.pickerCol}>
                  <Text style={styles.pickerLabel}>Hora</Text>
                  <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                    {Array.from({ length: 24 }, (_, i) => (
                      <TouchableOpacity
                        key={i} onPress={() => setTempHour(i)}
                        style={[styles.pItem, tempHour === i && styles.pItemOn]}
                      >
                        <Text style={[styles.pTxt, tempHour === i && styles.pTxtOn]}>
                          {String(i).padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <Text style={styles.colon}>:</Text>

                {/* Minutos */}
                <View style={styles.pickerCol}>
                  <Text style={styles.pickerLabel}>Min</Text>
                  <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                      <TouchableOpacity
                        key={m} onPress={() => setTempMinute(m)}
                        style={[styles.pItem, tempMinute === m && styles.pItemOn]}
                      >
                        <Text style={[styles.pTxt, tempMinute === m && styles.pTxtOn]}>
                          {String(m).padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.modalBtns}>
                <TouchableOpacity onPress={() => setShowTimePicker(false)} style={styles.btnCancel}>
                  <Text style={styles.btnCancelTxt}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveTime} style={styles.btnSave}>
                  <LinearGradient
                    colors={['#2B7FE8', '#7B1FA2']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.btnSaveGrad}
                  >
                    <Text style={styles.btnSaveTxt}>Guardar</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  safe:    { flex: 1, alignItems: 'center' },

  header:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 28 },
  title:       { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 5 },
  subtitle:    { marginTop: 6, fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.4)' },
  subtitleDone:{ color: '#4CAF50' },

  btnArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pulse: {
    position: 'absolute',
    width: 230, height: 230, borderRadius: 115,
    borderWidth: 2, borderColor: '#00CCFF',
  },
  mainBtn: {
    width: 200, height: 200, borderRadius: 100,
    justifyContent: 'center', alignItems: 'center', gap: 10,
    shadowColor: '#00CCFF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55, shadowRadius: 32, elevation: 20,
  },
  btnLabel: { color: '#fff', fontSize: 18, fontWeight: '700' },

  cardWrap: { width: '100%', paddingHorizontal: 20, paddingBottom: 34, gap: 10 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowLabel:   { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  dim:        { fontSize: 13, color: 'rgba(255,255,255,0.35)' },
  streakTxt:  { fontSize: 14, fontWeight: '600', color: '#FF8C00' },
  badge: {
    backgroundColor: 'rgba(0,204,255,0.15)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },
  badgeTxt: { color: '#00CCFF', fontWeight: '700', fontSize: 15 },

  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: '#14112A', padding: 24,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  pickerRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  pickerCol:  { flex: 1, alignItems: 'center' },
  pickerLabel:{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  scroll:     { height: 190 },
  pItem:      { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, marginVertical: 2 },
  pItemOn:    { backgroundColor: 'rgba(0,204,255,0.2)' },
  pTxt:       { color: 'rgba(255,255,255,0.45)', fontSize: 22, fontWeight: '600', textAlign: 'center' },
  pTxtOn:     { color: '#00CCFF' },
  colon:      { color: '#fff', fontSize: 28, fontWeight: '700', marginTop: 12 },

  modalBtns:   { flexDirection: 'row', gap: 12, marginTop: 24 },
  btnCancel:   { flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
  btnCancelTxt:{ color: 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: 16 },
  btnSave:     { flex: 1, borderRadius: 16, overflow: 'hidden' },
  btnSaveGrad: { paddingVertical: 14, alignItems: 'center' },
  btnSaveTxt:  { color: '#fff', fontWeight: '700', fontSize: 16 },
});
