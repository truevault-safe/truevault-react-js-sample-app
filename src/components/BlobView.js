import React, {Component} from "react";
import Spinner from "react-spinner";

export default class BlobView extends Component {
    constructor(props) {
        super(props);

        this.state = {loading: true, blobObjectUrl: null};
    }

    async componentDidMount() {
        const blob = await this.props.tvClient.getBlob(this.props.vaultId, this.props.blobId);
        this.setState({loading: false, blobObjectUrl: URL.createObjectURL(blob)});
    }

    render() {
        return this.state.loading ? <Spinner/> : <img alt="Blob" src={this.state.blobObjectUrl}/>;
    }
}

