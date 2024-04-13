// change
// this file contains two functions used by MultiTree that are customised versions of functions from @atlaskit/tree
import {
  getDestinationPath,
  getSourcePath
} from "@atlaskit/tree/utils/flat-tree";
import { getTreePosition } from "@atlaskit/tree/utils/tree";
import {
  isTopOfSubtree,
  hasSameParent,
  getPathOnLevel,
  moveAfterPath
} from "@atlaskit/tree/utils/path";
import { between } from "@atlaskit/tree/utils/handy";

// this is similar to Tree-utils.calculateFinalDropPositions
// but with changes to support moving between two trees
export const calculateNewTreeFinalDropPositions = (
  // change
  // added source/dest trees
  sourceTree,
  sourceFlatTree,
  destTree,
  flatDestTree,
  dragState
) => {
  const { source, destination, combine, horizontalLevel } = dragState;
  // change
  // looks up path/position in source tree
  const sourcePath = getSourcePath(sourceFlatTree, source.index);
  const sourcePosition = getTreePosition(sourceTree, sourcePath);

  if (combine) {
    return {
      sourcePosition,
      destinationPosition: {
        parentId: combine.draggableId
      }
    };
  }

  if (!destination) {
    return { sourcePosition, destinationPosition: null };
  }

  // change when different trees, use getGraftDestinationPath
  const destinationPath =
    sourceTree === destTree
      ? getDestinationPath(
          flatDestTree,
          source.index,
          destination.index,
          horizontalLevel,
          sourceTree === destTree
        )
      : getGraftDestinationPath(
          flatDestTree,
          destination.index,
          horizontalLevel
        );
  const destinationPosition = {
    ...getTreePosition(destTree, destinationPath)
  };
  return { sourcePosition, destinationPosition };
};

// change
// A customised version of getDestinationPath.
// For insertion of a remote item into a tree,
// resolves a flat index to a Path.
// Plant Analogy: Graft. To splice a foriegn branch/leaf onto a tree :D
export const getGraftDestinationPath = (
  flattenedTree,
  destinationIndex,
  // level on the tree, starting from 1.
  level
) => {
  // Path of the upper item where the item was dropped
  const upperPath =
    flattenedTree[destinationIndex - 1] &&
    flattenedTree[destinationIndex - 1].path;
  // Path of the lower item where the item was dropped
  const lowerPath =
    flattenedTree[destinationIndex] && flattenedTree[destinationIndex].path;

  /*
        - item moved to empty tree
        - item moved to the top of a subTree
        - item moved between two items on the same level
        - item moved to the end of subTree. This is an ambiguous case.
    */

  // item moved into empty tree
  if (!lowerPath && !upperPath) return [0];

  // Moved to top of the subTree (same as getDestinationPath)
  if (lowerPath && isTopOfSubtree(upperPath, lowerPath)) {
    return lowerPath;
  }

  // Moved between two items on the same level
  if (upperPath && lowerPath && hasSameParent(upperPath, lowerPath)) {
    return lowerPath;
  }

  // Moved to end of subTree
  if (upperPath) {
    // this means that the upper item is deeper in the tree.
    const finalLevel = calculateFinalLevel(
      upperPath,
      lowerPath,
      undefined,
      level
    );
    // Insert to higher levels
    const previousPathOnTheFinalLevel = getPathOnLevel(upperPath, finalLevel);

    const finalPath = moveAfterPath(
      previousPathOnTheFinalLevel,
      previousPathOnTheFinalLevel // previousPathOnTheFinalLevel used as from path to prevent compensation of 'moving down'
    );

    return finalPath;
  }
};

// change allow sourcePath to be undefined
// Calculates actual level when dropping item at the bottom of a tree/subtree
// e.g. when the upperPath is longer than lowerPath or lowerPath is undefined (nothing below)
// https://bitbucket.org/atlassian/atlaskit-mk-2/src/6bee782/packages/core/tree/src/utils/flat-tree.js#lines-133
const calculateFinalLevel = (
  upperPath,
  lowerPath,
  sourcePath,
  level: ?number
): number => {
  const upperLevel: number = upperPath.length;
  const lowerLevel: number = lowerPath ? lowerPath.length : 1;
  const sourceLevel: number = sourcePath && sourcePath.length;

  if (typeof level === "number") {
    // Explicit disambiguation based on level
    // Final level has to be between the levels of bounding items, inclusive
    return between(lowerLevel, upperLevel, level);
  }
  // Automatic disambiguation based on the initial level
  return sourceLevel && sourceLevel <= lowerLevel ? lowerLevel : upperLevel;
};
