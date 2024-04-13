import React, { Component } from "react";
import PropTypes from "prop-types";
import "./List.css";

export default class ListContainer extends Component {
  static propTypes = {
    children: PropTypes.element.isRequired,
    node: PropTypes.shape({ name: PropTypes.string.isRequired })
  };
  render = () => {
    const { node, children } = this.props;
    return (
      <div className="list-outer">
        <div className="list-inner">
          <div className="list-header">
            <div className="list-title">{node.name}</div>
          </div>
          <div className="list-body">{children}</div>
        </div>
      </div>
    );
  };
}
