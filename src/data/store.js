export const store = {
  users: new Map(),
  students: new Map(),
  teachers: new Map(),
  classes: new Map(),
  subjects: new Map(),
  results: new Map(),
};

export const getMapValues = (map) => [...map.values()];