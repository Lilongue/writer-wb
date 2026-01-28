import { NarrativeItem, EntityTemplate } from '../../../common/types';

type TreeNode = NarrativeItem & { children: TreeNode[] };

export const buildTree = (
  items: NarrativeItem[],
  narrativeTemplates: EntityTemplate[],
) => {
  if (narrativeTemplates.length === 0) {
    return []; // Cannot determine leaf nodes without templates
  }

  // Find the minimum weight among all templates
  const minWeight = Math.min(...narrativeTemplates.map((t) => t.weight));

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

  const templateMap = new Map<number, EntityTemplate>(
    narrativeTemplates.map((t) => [t.id, t]),
  );

  // Antd tree ожидает поля key и title
  const convertToAntdTreeFormat = (nodes: TreeNode[]): any[] => {
    return nodes.map((node) => {
      const template = templateMap.get(node.template_id);
      const isLeaf = template ? template.weight === minWeight : true; // Default to leaf if template not found

      return {
        ...node,
        key: node.id,
        title: node.name,
        template_id: node.template_id,
        children: node.children ? convertToAntdTreeFormat(node.children) : [],
        isLeaf,
      };
    });
  };

  return convertToAntdTreeFormat(tree);
};

export default buildTree;
