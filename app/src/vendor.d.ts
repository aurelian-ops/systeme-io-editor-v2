// SVG flags as strings (the package ships no types for these entry points)
declare module 'country-flag-icons/string/3x2/US' {
  const svg: string
  export default svg
}
declare module 'country-flag-icons/string/3x2' {
  const flags: Record<string, string>
  export = flags
}
