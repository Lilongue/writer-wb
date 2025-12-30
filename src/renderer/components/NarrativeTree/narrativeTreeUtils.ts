import { NarrativeItem } from '../../../common/types';

type TreeNode = NarrativeItem & { children: TreeNode[] };

export const buildTree = (items: NarrativeItem[]) => {
  const itemMap = new Map<number, TreeNode>(
    items.map((item) => [item.id, { ...item, children: [] }]),
  );
  const tree: TreeNode[] = [];

  items.forEach((item) => {
    const mapItem = itemMap.get(item.id)!;
    if (item.parent_id) {
      const parent = itemMap.get(item.parent_id);
      if (parent) {
        parent.children.push(mapItem);
      } else {
        tree.push(mapItem);
      }
    } else {
      tree.push(mapItem);
    }
  });

  // Antd tree ожидает поля key и title
  const convertToAntdTreeFormat = (nodes: TreeNode[]): any[] => {
    return nodes.map((node) => ({
      ...node,
      key: node.id,
      title: node.name,
      template_id: node.template_id, // Пробрасываем template_id
      children: node.children ? convertToAntdTreeFormat(node.children) : [],
    }));
  };

  return convertToAntdTreeFormat(tree);
};

export default buildTree;
