/** Which element is open in the editor (null = closed). */
export const useEditor = () => {
  const editingId = useState<string | null>('editingElementId', () => null)
  return { editingId, open: (id: string) => (editingId.value = id), close: () => (editingId.value = null) }
}
