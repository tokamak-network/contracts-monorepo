export const marshalString = (str: string) => {
  if (str.slice(0, 2) === '0x') return str;
  return '0x'.concat(str);
}

export const unmarshalString = (str: string) => {
  if (str.slice(0, 2) === '0x') return str.slice(2);
  return str;
}
