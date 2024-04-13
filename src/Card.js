import React, { Component } from "react";
import PropTypes from "prop-types";
import "./Card.css";

export default class Card extends Component {
  render = () => {
    const { item, onCollapse, onExpand } = this.props;
    return (
      <div className={`card-outer`}>
        <div className={`card-inner`}>
          {item.hasChildren && (
            <div onClick={() => (item.isExpanded ? onCollapse() : onExpand())}>
              {item.isExpanded ? "-" : "+"}
            </div>
          )}
          {item.data.name}
        </div>
      </div>
    );
  };
}
