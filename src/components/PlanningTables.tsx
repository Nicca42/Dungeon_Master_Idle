import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Body, Button, Heading, Row } from './ui';
import {
  decodeTables,
  ResearchCell,
  addColumn,
  addRow,
  initialTables,
  move,
  Table,
  TableKind,
  Tables,
  tablesSchema,
} from '../planning/tables';
import { readPlanningTables, writePlanningTables } from '../persistence';

export function PlanningTables() {
  const [tables, setTables] = useState<Tables | null>(null);
  const [kind, setKind] = useState<TableKind>('research');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    readPlanningTables()
      .then(async (saved) => {
        if (active) {
          const next = saved === null ? initialTables() : decodeTables(saved);
          if (saved !== null && JSON.stringify(saved) !== JSON.stringify(next)) {
            await writePlanningTables(next);
            if (!active) return;
            setNotice(
              'Missing entity stats updated from the reviewed research table. Saved edits preserved.',
            );
          }
          setTables(next);
          setError('');
        }
      })
      .catch(() => {
        if (active)
          setError('Saved tables could not be loaded. Your saved data has not been overwritten.');
      });
    return () => {
      active = false;
    };
  }, [reload]);
  const update = (change: (t: Table) => Table) => {
    setTables((current) => current && { ...current, [kind]: change(current[kind]) });
    setDirty(true);
    setNotice('');
  };
  const save = async () => {
    if (!tables || saving) return;
    setSaving(true);
    setNotice('');
    try {
      await writePlanningTables(tablesSchema.parse(tables));
      setDirty(false);
      setNotice('Both tables saved on this device.');
    } catch {
      setNotice('Could not save. Your edits are still here; please try again.');
    } finally {
      setSaving(false);
    }
  };
  const t = tables?.[kind];
  return (
    <View style={{ gap: 12 }}>
      <Heading>Research & entity planning tables</Heading>
      <Body>
        Edit names and cells, add rows or columns, and use arrows to rearrange them. Save both
        tables before leaving this page. These planning notes do not change the running dungeon’s
        rules.
      </Body>
      <Row style={{ flexWrap: 'wrap' }}>
        <Button compact secondary={kind !== 'research'} onPress={() => setKind('research')}>
          Research table
        </Button>
        <Button compact secondary={kind !== 'stats'} onPress={() => setKind('stats')}>
          Entity stats table
        </Button>
        <Button compact disabled={!tables || saving || !dirty} onPress={save}>
          {saving ? 'Saving tables…' : 'Save tables'}
        </Button>
      </Row>
      {!!error && (
        <>
          <Body>{error}</Body>
          <Button compact onPress={() => setReload((n) => n + 1)}>
            Retry loading tables
          </Button>
        </>
      )}
      {!tables && !error && <Body>Loading planning tables…</Body>}
      {!!notice && <Body>{notice}</Body>}
      {dirty && <Body>Unsaved changes</Body>}
      {t && (
        <>
          <Row style={{ flexWrap: 'wrap' }}>
            <Button
              compact
              disabled={saving}
              onPress={() => update((t) => addRow(t, kind === 'research'))}
            >
              Add row
            </Button>
            <Button
              compact
              disabled={saving}
              onPress={() => update((t) => addColumn(t, kind === 'research'))}
            >
              Add column
            </Button>
          </Row>
          <ScrollView
            horizontal
            style={{ maxWidth: '100%' }}
            accessibilityLabel="Planning table horizontal scroll"
          >
            <View>
              <Row style={styles.tableRow}>
                <View style={[styles.cell, styles.nameCell]}>
                  <Body>Track / entity</Body>
                </View>
                {t.columns.map((col, i) => (
                  <View key={col.id} style={styles.cell}>
                    <TextInput
                      accessibilityLabel={`Column ${i + 1} name`}
                      editable={!saving}
                      value={col.label}
                      style={styles.input}
                      onChangeText={(label) =>
                        update((v) => ({
                          ...v,
                          columns: v.columns.map((c) => (c.id === col.id ? { ...c, label } : c)),
                        }))
                      }
                    />
                    <Row>
                      <Button
                        compact
                        secondary
                        disabled={saving || i === 0}
                        accessibilityLabel={`Move column ${col.label} left`}
                        onPress={() => update((v) => ({ ...v, columns: move(v.columns, i, -1) }))}
                      >
                        ←
                      </Button>
                      <Button
                        compact
                        secondary
                        disabled={saving || i === t.columns.length - 1}
                        accessibilityLabel={`Move column ${col.label} right`}
                        onPress={() => update((v) => ({ ...v, columns: move(v.columns, i, 1) }))}
                      >
                        →
                      </Button>
                    </Row>
                  </View>
                ))}
              </Row>
              {t.rows.map((row, i) => (
                <Row key={row.id} style={styles.tableRow}>
                  <View style={[styles.cell, styles.nameCell]}>
                    <TextInput
                      multiline
                      accessibilityLabel={`Row ${i + 1} name`}
                      editable={!saving}
                      style={styles.input}
                      value={row.label}
                      onChangeText={(label) =>
                        update((v) => ({
                          ...v,
                          rows: v.rows.map((r) => (r.id === row.id ? { ...r, label } : r)),
                        }))
                      }
                    />
                    <Row>
                      <Button
                        compact
                        secondary
                        disabled={saving || i === 0}
                        accessibilityLabel={`Move row ${row.label} up`}
                        onPress={() => update((v) => ({ ...v, rows: move(v.rows, i, -1) }))}
                      >
                        ↑
                      </Button>
                      <Button
                        compact
                        secondary
                        disabled={saving || i === t.rows.length - 1}
                        accessibilityLabel={`Move row ${row.label} down`}
                        onPress={() => update((v) => ({ ...v, rows: move(v.rows, i, 1) }))}
                      >
                        ↓
                      </Button>
                    </Row>
                  </View>
                  {t.columns.map((col) => (
                    <View key={col.id} style={styles.cell}>
                      {kind === 'research' && typeof row.cells[col.id] !== 'string' ? (
                        (['name', 'description', 'unlocks', 'hours'] as const).map((field) => (
                          <View key={field} style={{ gap: 4 }}>
                            <Body>
                              {field === 'name'
                                ? 'Research name'
                                : field === 'description'
                                  ? 'Description'
                                  : field === 'unlocks'
                                    ? 'Unlocks / changes'
                                    : 'Research time (game hours)'}
                            </Body>
                            <TextInput
                              multiline
                              scrollEnabled
                              editable={!saving}
                              accessibilityLabel={`${row.label} — ${col.label} — ${field}`}
                              value={(row.cells[col.id] as ResearchCell)[field]}
                              style={[
                                styles.input,
                                {
                                  height: field === 'name' || field === 'hours' ? 80 : 160,
                                  textAlignVertical: 'top',
                                },
                              ]}
                              onChangeText={(value) =>
                                update((v) => ({
                                  ...v,
                                  rows: v.rows.map((r) =>
                                    r.id === row.id
                                      ? {
                                          ...r,
                                          cells: {
                                            ...r.cells,
                                            [col.id]: {
                                              ...(r.cells[col.id] as ResearchCell),
                                              [field]: value,
                                            },
                                          },
                                        }
                                      : r,
                                  ),
                                }))
                              }
                            />
                          </View>
                        ))
                      ) : (
                        <TextInput
                          multiline
                          scrollEnabled
                          accessibilityLabel={`${row.label} — ${col.label}`}
                          editable={!saving}
                          value={row.cells[col.id] as string}
                          style={[styles.input, styles.value]}
                          onChangeText={(value) =>
                            update((v) => ({
                              ...v,
                              rows: v.rows.map((r) =>
                                r.id === row.id
                                  ? { ...r, cells: { ...r.cells, [col.id]: value } }
                                  : r,
                              ),
                            }))
                          }
                        />
                      )}
                    </View>
                  ))}
                </Row>
              ))}
            </View>
          </ScrollView>
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  tableRow: { alignItems: 'stretch', gap: 0 },
  cell: {
    width: 260,
    padding: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#45404e',
    backgroundColor: '#201d28',
  },
  nameCell: { width: 190 },
  input: {
    color: '#f7eddb',
    backgroundColor: '#17151d',
    borderWidth: 1,
    borderColor: '#655b72',
    borderRadius: 4,
    padding: 10,
    fontSize: 14,
    minHeight: 44,
  },
  value: { height: 230, textAlignVertical: 'top', lineHeight: 20 },
});
