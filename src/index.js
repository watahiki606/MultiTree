import React, { Component } from "react";
import ReactDOM from "react-dom";
import exampleTrees from "./example-data";
import MultiTree from "./MultiTree";
import ListContainer from "./ListContainer";
import Card from "./Card";
import { mutateTree } from "@atlaskit/tree";
import "@atlaskit/css-reset";
import "./Board.css";

const PADDING_PER_LEVEL = 16;

class Board extends Component {
  state = {
    trees: exampleTrees
  };

  // source and destinatin are {parentId, index}
  // this is an example of how you could update your state if you're using the TreeData format.
  // However, your data could be in a different format from which the trees passed to MultiTree are derived.
  onDragEnd = (sourcePosition, destinationPosition) => {
    if (!destinationPosition) {
      return;
    }
    const { trees } = this.state;
    const sourceTree = trees.find(
      tree => !!tree.items[sourcePosition.parentId]
    );
    const destTree = trees.find(
      tree => !!tree.items[destinationPosition.parentId]
    );

    // removeItemFromTree actually just removes the itemId from parent item's children
    const {
      tree: newSourceTree,
      itemRemoved: removedItemId
    } = Board.removeItemFromTree(sourceTree, sourcePosition);

    const movingItem = sourceTree.items[removedItemId];
    const childItems = Board.getAllItemChildren(sourceTree, movingItem.id);

    // actually remove the item and children from items
    delete newSourceTree.items[removedItemId];
    childItems.forEach(item => delete newSourceTree.items[item.id]);

    const newDestTree = Board.addItemToTree(
      destTree === sourceTree ? newSourceTree : destTree,
      destinationPosition,
      removedItemId
    );

    // actually add the item and children to items
    newDestTree.items[removedItemId] = movingItem;
    childItems.forEach(item => (newDestTree.items[item.id] = item));

    this.updateTreesInState([newDestTree, newSourceTree]);
  };

  static getAllItemChildren(tree, itemId) {
    const item = tree.items[itemId];
    const childIds = item.children;
    const children = [];
    childIds.forEach(childId =>
      children.push(
        tree.items[childId],
        ...Board.getAllItemChildren(tree, childId)
      )
    );
    return children;
  }

  // from @atlaskit/tree/utils/tree (not exported)
  static removeItemFromTree = (tree, position) => {
    const sourceParent = tree.items[position.parentId];
    const newSourceChildren = [...sourceParent.children];
    const itemRemoved = newSourceChildren.splice(position.index, 1)[0];
    const newTree = mutateTree(tree, position.parentId, {
      children: newSourceChildren,
      hasChildren: newSourceChildren.length > 0,
      isExpanded: newSourceChildren.length > 0 && sourceParent.isExpanded
    });
    return {
      tree: newTree,
      itemRemoved
    };
  };

  // from @atlaskit/tree/utils/tree (not exported)
  static addItemToTree = (tree, position, item) => {
    const destinationParent = tree.items[position.parentId];
    const newDestinationChildren = [...destinationParent.children];
    if (typeof position.index === "undefined") {
      if (
        /*hasLoadedChildren*/ (!!destinationParent.hasChildren &&
          destinationParent.children.length > 0) ||
        /*isLeafItem*/ !destinationParent.hasChildren
      ) {
        newDestinationChildren.push(item);
      }
    } else {
      newDestinationChildren.splice(position.index, 0, item);
    }
    return mutateTree(tree, position.parentId, {
      children: newDestinationChildren,
      hasChildren: true
    });
  };

  findTreeWithItem(itemId) {
    const { trees } = this.state;
    return trees.find(tree => !!tree.items[itemId]);
  }

  updateTreesInState(newTrees) {
    const { trees } = this.state;
    const finalTrees = trees.map(tree => {
      return newTrees.find(newTree => tree.rootId === newTree.rootId) || tree;
    });
    this.setState({ trees: finalTrees });
  }

  onExpand = id => this.setExpanded(id, true);
  onCollapse = id => this.setExpanded(id, false);

  setExpanded = (id, isExpanded) => {
    const sourceTree = this.findTreeWithItem(id);
    const newTree = mutateTree(sourceTree, id, { isExpanded });
    this.updateTreesInState([newTree]);
  };

  renderItem = ({ item, provided }) => {
    return (
      <div
        className={"card"}
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
      >
        <Card
          item={item}
          onExpand={() => this.setExpanded(item.id, true)}
          onCollapse={() => this.setExpanded(item.id, false)}
        />
      </div>
    );
  };

  render = () => {
    const { trees } = this.state;
    return (
      <div className={"lists-container"}>
        <MultiTree
          trees={trees}
          container={ListContainer}
          renderItem={this.renderItem}
          onExpand={this.onExpand}
          onCollapse={this.onCollapse}
          onDragEnd={this.onDragEnd}
          offsetPerLevel={PADDING_PER_LEVEL}
          isDragEnabled
          isNestingEnabled
        />
      </div>
    );
  };
}

ReactDOM.render(<Board />, document.getElementById("root"));
