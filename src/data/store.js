export const store = {
  users: new Map(),
  students: new Map(),
  teachers: new Map(),
  classes: new Map(),
  subjects: new Map(),
  results: new Map(),
};

export const collections = {
  students: store.students,
  teachers: store.teachers,
  classes: store.classes,
  subjects: store.subjects,
  results: store.results,
};

export function records(map) {
  return [...map.values()];
}