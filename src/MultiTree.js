import React, { Component } from "react";
import { Draggable, Droppable, DragDropContext } from "react-beautiful-dnd";
import { getBox } from "css-box-model";
import { calculateFinalDropPositions } from "@atlaskit/tree/components/Tree/Tree-utils";
import { noop } from "@atlaskit/tree/utils/handy";
import { flattenTree, mutateTree } from "@atlaskit/tree/utils/tree";
import TreeItem from "@atlaskit/tree/components/TreeItem";
import {
  getDestinationPath,
  getItemById,
  getIndexById
} from "@atlaskit/tree/utils/flat-tree";
import DelayedFunction from "@atlaskit/tree/utils/delayed-function";
import {
  getGraftDestinationPath,
  calculateNewTreeFinalDropPositions
} from "./MultiTree-utils"; // customised functions

export default class MultiTree extends Component {
  static defaultProps = {
    tree: { children: [] },
    onExpand: noop,
    onCollapse: noop,
    onDragStart: noop,
    onDragEnd: noop,
    renderItem: noop,
    offsetPerLevel: 35,
    isDragEnabled: false,
    isNestingEnabled: false
  };

  state = {
    flattenedTrees: {},
    draggedItemId: null
  };

  // State of dragging. Null when resting
  dragState = null;
  // HTMLElement for each rendered item
  itemsElement = {};
  // HTMLElement of the container element
  containerElement;
  containerElements = {};

  expandTimer = new DelayedFunction(500);

  // changes
  // trees prop instead of tree
  // run closeParentIfNeeded on all trees -> finalTrees
  // flattenedTrees in state instead of flattenedTree
  static getDerivedStateFromProps(props, state) {
    const { draggedItemId } = state;
    const { trees } = props;

    const finalTrees = trees.map(tree =>
      MultiTree.closeParentIfNeeded(tree, draggedItemId)
    );
    const flattenedTrees = finalTrees.reduce((accumulator, finalTree) => {
      accumulator[finalTree.rootId] = flattenTree(finalTree);
      return accumulator;
    }, {});

    return {
      ...state,
      flattenedTrees
    };
  }

  // not changed from Tree component
  static closeParentIfNeeded(tree, draggedItemId) {
    if (draggedItemId !== null) {
      // Closing parent internally during dragging, because visually we can only move one item not a subtree
      return mutateTree(tree, draggedItemId, {
        isExpanded: false
      });
    }
    return tree;
  }

  // change
  // update this.containerElement
  onDragStart = result => {
    const { onDragStart } = this.props;
    this.dragState = {
      source: result.source,
      destination: result.source,
      mode: result.mode
    };
    this.setState({
      draggedItemId: result.draggableId
    });

    // change update the containerElement used by getDroppedLevel
    this.containerElement = this.containerElements[
      result.source ? result.source.droppableId : undefined
    ];

    if (onDragStart) {
      onDragStart(result.draggableId);
    }
    // console.log(JSON.stringify(this.dragState));
  };

  // changed
  // update this.containerElement
  // combine looks up correct tree by drobbableId
  onDragUpdate = update => {
    const { onExpand } = this.props;
    const { flattenedTrees } = this.state;
    if (!this.dragState) {
      return;
    }

    this.expandTimer.stop();
    if (update.combine) {
      const { draggableId, droppableId } = update.combine;
      const item = getItemById(flattenedTrees[droppableId], draggableId);
      if (item && this.isExpandable(item)) {
        this.expandTimer.start(() => onExpand(draggableId, item.path));
      }
    }

    // change update the containerElement used by getDroppedLevel
    this.containerElement = this.containerElements[
      update.destination ? update.destination.droppableId : undefined
    ];

    this.dragState = {
      ...this.dragState,
      destination: update.destination,
      combine: update.combine
    };
    // console.log(JSON.stringify(this.dragState));
  };

  onDropAnimating = () => {
    this.expandTimer.stop();
  };

  // change
  // lookups of source/destination trees
  // for same tree, original @atlaskit/tree code is used
  // for different trees, custom code is used.
  onDragEnd = result => {
    const { onDragEnd, trees } = this.props;
    const { flattenedTrees } = this.state;
    this.expandTimer.stop();
    const finalDragState = {
      ...this.dragState,
      source: result.source,
      destination: result.destination,
      combine: result.combine
    };
    const sourceDroppableId = finalDragState.source.droppableId;
    const destDroppableId = finalDragState.destination
      ? finalDragState.destination.droppableId
      : undefined;
    const sourceTree = trees.find(tree => tree.rootId === sourceDroppableId);
    const destTree = trees.find(tree => tree.rootId === destDroppableId);
    const sourceFlatTree = flattenedTrees[sourceDroppableId];
    const destFlatTree = flattenedTrees[destDroppableId];
    // console.log('finalDragState', JSON.stringify(finalDragState));
    this.setState({
      draggedItemId: null
    });

    const { sourcePosition, destinationPosition } =
      sourceTree === destTree || !destDroppableId
        ? calculateFinalDropPositions(
            // original from @atlaskit/tree
            sourceTree,
            sourceFlatTree,
            finalDragState
          )
        : calculateNewTreeFinalDropPositions(
            // support for cross-tree
            sourceTree,
            sourceFlatTree,
            destTree,
            destFlatTree,
            finalDragState
          );
    onDragEnd(sourcePosition, destinationPosition);
    this.dragState = null;
  };

  // doesn't need changing
  onPointerMove = () => {
    if (this.dragState) {
      this.dragState = {
        ...this.dragState,
        horizontalLevel: this.getDroppedLevel()
      };
      // console.log(JSON.stringify(this.dragState));
    }
  };

  // change
  // custom getDestinationPath for different trees
  calculateEffectivePath = (flatItem, snapshot) => {
    const { flattenedTrees, draggedItemId } = this.state;
    if (
      this.dragState &&
      draggedItemId === flatItem.item.id &&
      (this.dragState.destination || this.dragState.combine)
    ) {
      const {
        source,
        destination,
        combine,
        horizontalLevel,
        mode
      } = this.dragState;
      // We only update the path when it's dragged by keyboard or drop is animated
      if (mode === "SNAP" || snapshot.isDropAnimating) {
        if (destination) {
          // Between two items
          const flattenedTree = flattenedTrees[destination.droppableId];
          const sameTree = source.droppableId === destination.droppableId;
          return sameTree
            ? getDestinationPath(
                flattenedTree,
                source.index,
                destination.index,
                horizontalLevel
              )
            : getGraftDestinationPath(
                flattenedTree,
                destination.index,
                horizontalLevel
              );
        }

        if (combine) {
          const flattenedTree = flattenedTrees[combine.droppableId];
          // Hover on other item while dragging
          const sameTree = source.droppableId === combine.droppableId;
          return sameTree
            ? getDestinationPath(
                flattenedTree,
                source.index,
                getIndexById(flattenedTree, combine.draggableId),
                horizontalLevel
              )
            : getGraftDestinationPath(
                flattenedTree,
                getIndexById(flattenedTree, combine.draggableId),
                horizontalLevel
              );
        }
      }
    }
    return flatItem.path;
  };

  // doesn't need changing
  isExpandable = item => !!item.item.hasChildren && !item.item.isExpanded;

  // doesn't need changing (but we did change how this.containerElement is updated)
  getDroppedLevel = () => {
    const { offsetPerLevel } = this.props;
    const { draggedItemId } = this.state;

    if (!this.dragState || !this.containerElement) {
      return undefined;
    }
    const containerLeft = getBox(this.containerElement).contentBox.left;
    const itemElement = this.itemsElement[draggedItemId];
    if (itemElement) {
      const currentLeft = getBox(itemElement).contentBox.left;
      const relativeLeft = Math.max(currentLeft - containerLeft, 0);
      return (
        Math.floor((relativeLeft + offsetPerLevel / 2) / offsetPerLevel) + 1
      );
    }
    return undefined;
  };

  // change added droppableId prop
  // and containerElemenets object
  patchDroppableProvided = (provided, droppableId) => ({
    ...provided,
    innerRef: el => {
      // change we need to track each tree container
      // for calculating dropped level in getDroppedLevel
      this.containerElements[droppableId] = el;
      provided.innerRef(el);
    }
  });

  // doesn't need changing
  setItemRef = (itemId, el) => {
    this.itemsElement[itemId] = el;
  };

  // change
  // this is a replacement for Tree.renderItems
  // renders all items from all flattenedTrees
  // returns a map of rendered trees by tree id
  renderTrees = () => {
    const { flattenedTrees } = this.state;
    return Object.keys(flattenedTrees).reduce((renderedTrees, id) => {
      renderedTrees[id] = flattenedTrees[id].map(this.renderItem);
      return renderedTrees;
    }, {});
  };

  // doesn't need changing
  renderItem = (flatItem, index) => {
    const { isDragEnabled } = this.props;

    return (
      <Draggable
        draggableId={flatItem.item.id}
        index={index}
        key={flatItem.item.id}
        isDragDisabled={!isDragEnabled}
      >
        {this.renderDraggableItem(flatItem)}
      </Draggable>
    );
  };

  // doesn't need changing
  renderDraggableItem = flatItem => (provided, snapshot) => {
    const { renderItem, onExpand, onCollapse, offsetPerLevel } = this.props;
    const currentPath = this.calculateEffectivePath(flatItem, snapshot);
    if (snapshot.isDropAnimating) {
      this.onDropAnimating();
    }
    return (
      <TreeItem
        key={flatItem.item.id}
        item={flatItem.item}
        path={currentPath}
        onExpand={onExpand}
        onCollapse={onCollapse}
        renderItem={renderItem}
        provided={provided}
        snapshot={snapshot}
        itemRef={this.setItemRef}
        offsetPerLevel={offsetPerLevel}
      />
    );
  };

  // change
  // map trees to multiple Droppables
  // added container Component from prop for each tree
  // droppableId set to root item id
  // added placeholder
  render() {
    const {
      isNestingEnabled,
      trees,
      container: Container = "div"
    } = this.props;
    const renderedTrees = this.renderTrees();
    return (
      <DragDropContext
        onDragStart={this.onDragStart}
        onDragEnd={this.onDragEnd}
        onDragUpdate={this.onDragUpdate}
      >
        {// change multiple trees to render
        trees.map(tree => {
          const listId = tree.rootId;
          const rootItem = tree.items[tree.rootId];

          // TODO make containers draggable
          // change render the tree root item as a container
          return (
            <Container key={listId} node={rootItem.data}>
              <Droppable
                droppableId={listId}
                isCombineEnabled={isNestingEnabled}
                ignoreContainerClipping
              >
                {provided => {
                  const finalProvided = this.patchDroppableProvided(
                    provided,
                    listId // change added listId prop
                  );
                  return (
                    <div
                      ref={finalProvided.innerRef}
                      style={{ pointerEvents: "auto" }}
                      onTouchMove={this.onPointerMove}
                      onMouseMove={this.onPointerMove}
                      {...finalProvided.droppableProps}
                    >
                      {renderedTrees[listId]}
                      {
                        finalProvided.placeholder // change placeholder missing from original Tree
                      }
                    </div>
                  );
                }}
              </Droppable>
            </Container>
          );
        })}
      </DragDropContext>
    );
  }
}
