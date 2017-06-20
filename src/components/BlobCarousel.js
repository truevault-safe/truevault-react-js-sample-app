import React, {Component} from "react";
import PropTypes from "prop-types";
import {Carousel} from "react-bootstrap";
import BlobView from "./BlobView";
import "./BlobCarousel.scss";
import TrueVaultClient from "tv-js-sdk";

class BlobCarousel extends Component {
    render() {
        return <div className="blob-carousel">
            <Carousel interval={null} style={this.props.style}>
                {this.props.imageIds.map(caseImageId => {
                    return <Carousel.Item key={caseImageId}>
                        <BlobView blobId={caseImageId} tvClient={this.props.tvClient}
                                  vaultId={this.props.vaultId}/>
                    </Carousel.Item>;
                })}
            </Carousel>
        </div>;
    }
}

BlobCarousel.propTypes = {
    tvClient: PropTypes.instanceOf(TrueVaultClient).isRequired,
    imageIds: PropTypes.arrayOf(PropTypes.string).isRequired,
    vaultId: PropTypes.string.isRequired,
    style: PropTypes.object
};

export default BlobCarousel;

